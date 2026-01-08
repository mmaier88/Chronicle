import { NextResponse } from 'next/server'
import { createServiceClient, getUser } from '@/lib/supabase/server'
import { generateCoverWithRetry, buildCoverPrompt } from '@/lib/gemini/imagen'
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
      .select('id, owner_id, title, genre, constitution_json, cover_status, cover_url')
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

    // Get preview data from vibe_jobs for better prompt context
    const { data: vibeJob } = await supabase
      .from('vibe_jobs')
      .select('preview')
      .eq('book_id', bookId)
      .single()

    const preview = vibeJob?.preview as VibePreview | undefined

    // Update status to generating
    await supabase
      .from('books')
      .update({ cover_status: 'generating' })
      .eq('id', bookId)

    try {
      // Build the cover prompt
      const prompt = buildCoverPrompt({
        title: book.title,
        genre: book.genre,
        blurb: preview?.blurb,
        setting: preview?.setting,
        cast: preview?.cast,
        narrativeVoice: book.constitution_json?.narrative_voice,
      })

      // Generate the cover image
      const imageBuffer = await generateCoverWithRetry(prompt)

      // Upload to Supabase Storage
      const storagePath = `${user.id}/${bookId}/cover.png`

      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(storagePath, imageBuffer, {
          contentType: 'image/png',
          upsert: true, // Allow overwriting for regeneration
        })

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`)
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('covers')
        .getPublicUrl(storagePath)

      const coverUrl = urlData.publicUrl

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

      return apiSuccess({
        status: 'ready',
        cover_url: coverUrl,
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
