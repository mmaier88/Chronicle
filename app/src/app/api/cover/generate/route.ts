import { NextResponse } from 'next/server'
import { createServiceClient, getUser } from '@/lib/supabase/server'
import { generateCoverWithRetry, buildCoverPrompt } from '@/lib/gemini/imagen'
import { VibePreview } from '@/types/chronicle'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const { user } = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { bookId, regenerate } = await request.json()

    if (!bookId) {
      return NextResponse.json({ error: 'bookId is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get book with preview data from vibe_jobs
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, owner_id, title, genre, constitution_json, cover_status, cover_url')
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // Verify ownership
    if (book.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Skip if cover already exists and not regenerating
    if (book.cover_status === 'ready' && book.cover_url && !regenerate) {
      return NextResponse.json({
        status: 'ready',
        cover_url: book.cover_url,
      })
    }

    // Skip if already generating
    if (book.cover_status === 'generating' && !regenerate) {
      return NextResponse.json({
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

      return NextResponse.json({
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

      return NextResponse.json(
        {
          status: 'failed',
          error: genError instanceof Error ? genError.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error('Cover API error', error, { operation: 'cover_api' })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
