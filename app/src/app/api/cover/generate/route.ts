/**
 * Cover Generation API
 *
 * Uses the new Chronicle Cover System:
 * - AI generates image assets (constrained, no text)
 * - Chronicle composes covers (deterministic typography)
 */

import { NextResponse } from 'next/server'
import { createServiceClient, getUser } from '@/lib/supabase/server'
import { generateCover } from '@/lib/cover'
import { VibePreview } from '@/types/chronicle'
import { logger } from '@/lib/logger'
import { checkRateLimit, RATE_LIMITS, rateLimitHeaders } from '@/lib/rate-limit'
import {
  apiSuccess,
  ApiErrors,
  validateBody,
  isApiError,
  coverGenerateSchema,
} from '@/lib/api-utils'

// Clean env var value - remove quotes, trailing \n literal, and whitespace
const cleanEnvValue = (v: string | null | undefined) =>
  v?.replace(/^["']|["']$/g, '').replace(/\\n$/g, '').trim()

export async function POST(request: Request) {
  try {
    const supabase = createServiceClient()

    // Check for service-level auth (internal calls from tick endpoint)
    const cronSecret = cleanEnvValue(request.headers.get('x-cron-secret'))
    const expectedSecret = cleanEnvValue(process.env.CRON_SECRET)
    const serviceUserId = request.headers.get('x-user-id')

    const isServiceAuth = cronSecret && expectedSecret && cronSecret === expectedSecret && serviceUserId

    // Get user - either from session or service auth
    let effectiveUserId: string
    let userDisplayName: string | undefined

    if (isServiceAuth) {
      // Service-level auth for internal calls
      effectiveUserId = serviceUserId

      // Look up user info for author name
      const { data: userData } = await supabase.auth.admin.getUserById(effectiveUserId)
      userDisplayName = userData?.user?.user_metadata?.full_name || userData?.user?.email?.split('@')[0]

      logger.info('Cover generation: service auth', { userId: effectiveUserId })
    } else {
      // Regular user auth
      const { user } = await getUser()
      if (!user) {
        return ApiErrors.unauthorized()
      }
      effectiveUserId = user.id
      userDisplayName = user.user_metadata?.full_name || user.email?.split('@')[0]

      // Rate limit per user (skip for service auth - internal calls are controlled)
      const rateLimit = checkRateLimit(`cover:${user.id}`, RATE_LIMITS.cover)
      if (!rateLimit.success) {
        return NextResponse.json(
          { success: false, error: 'Rate limit exceeded. Please wait before generating more covers.' },
          { status: 429, headers: rateLimitHeaders(rateLimit) }
        )
      }
    }

    // Validate request body
    const validated = await validateBody(request, coverGenerateSchema)
    if (isApiError(validated)) return validated

    const { bookId, regenerate } = validated

    // Get book with preview data from vibe_jobs
    // Note: cover_concept column may not exist in all environments
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, owner_id, title, genre, constitution_json, cover_status, cover_url')
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      logger.error('Book query failed', bookError, { bookId, operation: 'cover_generate' })
      return ApiErrors.notFound('Book')
    }

    // Verify ownership (service auth bypasses this since it's internal)
    if (!isServiceAuth && book.owner_id !== effectiveUserId) {
      return ApiErrors.forbidden()
    }

    // Skip if cover already exists and not regenerating
    if (book.cover_status === 'ready' && book.cover_url && !regenerate) {
      return apiSuccess({
        status: 'ready',
        cover_url: book.cover_url,
      })
    }

    // Skip if already generating
    if (book.cover_status === 'generating' && !regenerate) {
      return apiSuccess({
        status: 'generating',
        message: 'Cover generation in progress',
      })
    }

    // Get preview data from vibe_jobs for better context
    const { data: vibeJob } = await supabase
      .from('vibe_jobs')
      .select('preview, prompt')
      .eq('book_id', bookId)
      .single()

    const preview = vibeJob?.preview as VibePreview | undefined

    // Build summary from available data
    const summary = buildSummary(preview, vibeJob?.prompt, book.constitution_json)

    // Update status to generating
    await supabase
      .from('books')
      .update({ cover_status: 'generating' })
      .eq('id', bookId)

    try {
      // Generate cover with full pipeline
      // Note: concept reuse feature requires cover_concept column (migration 00009)
      logger.info('Cover generation: starting pipeline', { bookId, regenerate })
      const result = await generateCover({
        summary,
        genre: book.genre,
        mood: preview?.promise?.[0], // Use first promise as mood hint
        title: book.title,
        author: userDisplayName,
      })

      if (!result.success || !result.coverBuffer) {
        throw new Error(result.error || 'Cover generation failed')
      }

      // Upload to Supabase Storage (WebP for better compression)
      const storagePath = `${effectiveUserId}/${bookId}/cover.webp`

      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(storagePath, result.coverBuffer, {
          contentType: 'image/webp',
          upsert: true,
        })

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`)
      }

      // Get public URL with cache-busting timestamp
      const { data: urlData } = supabase.storage
        .from('covers')
        .getPublicUrl(storagePath)

      const coverUrl = `${urlData.publicUrl}?t=${Date.now()}`

      // Update book with cover URL
      await supabase
        .from('books')
        .update({
          cover_url: coverUrl,
          cover_storage_path: storagePath,
          cover_status: 'ready',
          cover_generated_at: new Date().toISOString(),
        })
        .eq('id', bookId)

      logger.info('Cover generation complete', {
        bookId,
        attempts: result.attempts,
        concept: result.concept?.visual_metaphor,
      })

      return apiSuccess({
        status: 'ready',
        cover_url: coverUrl,
        concept: result.concept,
        attempts: result.attempts,
      })
    } catch (genError) {
      logger.error('Cover generation failed', genError, { bookId, operation: 'cover_generate' })

      // Update status to failed
      await supabase
        .from('books')
        .update({ cover_status: 'failed' })
        .eq('id', bookId)

      return ApiErrors.internal(genError instanceof Error ? genError.message : 'Cover generation failed')
    }
  } catch (error) {
    logger.error('Cover API error', error, { operation: 'cover_api' })
    return ApiErrors.internal()
  }
}

/**
 * Build a summary string from available metadata
 */
function buildSummary(
  preview: VibePreview | undefined,
  prompt: string | undefined,
  constitution: Record<string, unknown> | null
): string {
  const parts: string[] = []

  if (preview?.blurb) {
    parts.push(preview.blurb)
  }

  if (preview?.logline) {
    parts.push(preview.logline)
  }

  if (preview?.setting) {
    parts.push(`Setting: ${preview.setting}`)
  }

  if (preview?.cast && preview.cast.length > 0) {
    const mainChar = preview.cast[0]
    parts.push(`Main character: ${mainChar.name} - ${mainChar.tagline}`)
  }

  if (constitution?.central_thesis) {
    parts.push(`Theme: ${constitution.central_thesis}`)
  }

  if (prompt && parts.length === 0) {
    parts.push(prompt)
  }

  return parts.join('\n\n') || 'A compelling story'
}
