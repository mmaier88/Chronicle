/**
 * Cover Generation API
 *
 * Uses the new Chronicle Cover System:
 * - AI generates image assets (constrained, no text)
 * - Chronicle composes covers (deterministic typography)
 */

import { NextResponse } from 'next/server'
import { createServiceClient, getUser } from '@/lib/supabase/server'
import { generateCover, regenerateCover, type Concept } from '@/lib/cover'
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

export async function POST(request: Request) {
  try {
    const { user } = await getUser()
    if (!user) {
      return ApiErrors.unauthorized()
    }

    // Rate limit per user
    const rateLimit = checkRateLimit(`cover:${user.id}`, RATE_LIMITS.cover)
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please wait before generating more covers.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      )
    }

    // Validate request body
    const validated = await validateBody(request, coverGenerateSchema)
    if (isApiError(validated)) return validated

    const { bookId, regenerate } = validated

    const supabase = createServiceClient()

    // Get book with preview data from vibe_jobs
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, owner_id, title, genre, constitution_json, cover_status, cover_url, cover_concept')
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      return ApiErrors.notFound('Book')
    }

    // Verify ownership
    if (book.owner_id !== user.id) {
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
      let result

      // If regenerating and we have an existing concept, reuse it
      if (regenerate && book.cover_concept) {
        logger.info('Cover regeneration: reusing existing concept', { bookId })
        result = await regenerateCover(
          book.cover_concept as Concept,
          book.title,
          user.user_metadata?.full_name || user.email?.split('@')[0],
          book.genre
        )
      } else {
        // Generate new cover with full pipeline
        logger.info('Cover generation: starting new pipeline', { bookId })
        result = await generateCover({
          summary,
          genre: book.genre,
          mood: preview?.promise?.[0], // Use first promise as mood hint
          title: book.title,
          author: user.user_metadata?.full_name || user.email?.split('@')[0],
        })
      }

      if (!result.success || !result.coverBuffer) {
        throw new Error(result.error || 'Cover generation failed')
      }

      // Upload to Supabase Storage (WebP for better compression)
      const storagePath = `${user.id}/${bookId}/cover.webp`

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

      // Update book with cover URL and concept (for future regeneration)
      await supabase
        .from('books')
        .update({
          cover_url: coverUrl,
          cover_storage_path: storagePath,
          cover_status: 'ready',
          cover_generated_at: new Date().toISOString(),
          cover_concept: result.concept, // Store for regeneration
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
