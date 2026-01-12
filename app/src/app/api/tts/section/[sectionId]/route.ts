import { createServiceClient, getUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  streamSpeech,
  computeContentHash,
  estimateDuration,
  DEFAULT_VOICE_ID,
  BOOK_VOICES,
} from '@/lib/elevenlabs/client'
import { checkRateLimit, RATE_LIMITS, rateLimitHeaders } from '@/lib/rate-limit'

interface RouteParams {
  params: Promise<{ sectionId: string }>
}

// GET: Get or stream audio for a section
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { sectionId } = await params
  const { user } = await getUser()
  const wantsMetadata = request.nextUrl.searchParams.get('metadata') === 'true'
  const forceRegenerate = request.nextUrl.searchParams.get('regenerate') === 'true'

  console.log(`[TTS] GET /api/tts/section/${sectionId}`, { wantsMetadata, forceRegenerate, userId: user?.id?.substring(0, 8) })

  if (!user) {
    console.log('[TTS] Unauthorized - no user')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit per user
  const rateLimit = checkRateLimit(`tts:${user.id}`, RATE_LIMITS.tts)
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait before generating more audio.' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    )
  }

  const supabase = createServiceClient()

  // Get section with title and index
  const { data: section, error: sectionError } = await supabase
    .from('sections')
    .select('id, title, content_text, chapter_id, index')
    .eq('id', sectionId)
    .single()

  if (sectionError || !section) {
    return NextResponse.json({ error: 'Section not found' }, { status: 404 })
  }

  // Get chapter with title, index and book for ownership check and voice settings
  const { data: chapter } = await supabase
    .from('chapters')
    .select('book_id, title, index')
    .eq('id', section.chapter_id)
    .single()

  if (!chapter) {
    return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })
  }

  const { data: book } = await supabase
    .from('books')
    .select('id, owner_id, audio_voice_id')
    .eq('id', chapter.book_id)
    .single()

  if (!book) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 })
  }

  // Check ownership
  if (book.owner_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  if (!section.content_text) {
    return NextResponse.json({ error: 'Section has no content' }, { status: 400 })
  }

  // Build full text with chapter and section titles for narration
  const isFirstSection = section.index === 0
  const chapterNumber = (chapter.index || 0) + 1
  const chapterIntro = isFirstSection && chapter.title
    ? `Chapter ${chapterNumber}: ${chapter.title}.\n\n`
    : ''
  const sectionIntro = section.title ? `${section.title}.\n\n` : ''
  const fullText = `${chapterIntro}${sectionIntro}${section.content_text}`

  const contentHash = computeContentHash(fullText)
  const voiceId = book.audio_voice_id || DEFAULT_VOICE_ID
  const voiceName = BOOK_VOICES.find(v => v.id === voiceId)?.name || 'Unknown'
  const storagePath = `${user.id}/${sectionId}/${contentHash}.mp3`

  // If force regenerate, delete existing cached audio
  if (forceRegenerate) {
    console.log('[TTS] Force regenerate requested, deleting cached audio')
    await supabase
      .from('section_audio')
      .delete()
      .eq('section_id', sectionId)
    await supabase.storage
      .from('audio')
      .remove([storagePath])
  }

  // Check if we already have cached audio
  const { data: existingAudio } = await supabase
    .from('section_audio')
    .select('*')
    .eq('section_id', sectionId)
    .eq('content_hash', contentHash)
    .eq('status', 'ready')
    .single()

  if (existingAudio) {
    console.log('[TTS] Found cached audio:', existingAudio.id)
    // Update last_accessed_at for cleanup tracking
    await supabase.rpc('touch_section_audio', { audio_id: existingAudio.id })

    // Get signed URL for the audio file
    const { data: signedUrl } = await supabase.storage
      .from('audio')
      .createSignedUrl(existingAudio.storage_path, 3600)

    if (signedUrl) {
      console.log('[TTS] Returning cached audio URL')
      // Return JSON metadata if requested (for player to know it's cached)
      if (wantsMetadata) {
        return NextResponse.json({
          status: 'ready',
          audio_url: signedUrl.signedUrl,
          duration_seconds: existingAudio.duration_seconds,
          voice_name: existingAudio.voice_name,
          cached: true,
        })
      }

      // Otherwise redirect to the cached audio
      return NextResponse.redirect(signedUrl.signedUrl)
    }
  }

  // For metadata-only requests, indicate we need to stream
  if (wantsMetadata) {
    console.log('[TTS] No cached audio, returning streaming metadata')
    return NextResponse.json({
      status: 'streaming',
      stream_url: `/api/tts/section/${sectionId}`,
      duration_seconds: estimateDuration(fullText),
      voice_name: voiceName,
      cached: false,
    })
  }

  console.log('[TTS] Starting streaming generation...')

  // Check if generation is already in progress
  const { data: pendingAudio } = await supabase
    .from('section_audio')
    .select('*')
    .eq('section_id', sectionId)
    .in('status', ['pending', 'generating'])
    .single()

  if (pendingAudio) {
    console.log('[TTS] Audio generation already in progress:', pendingAudio.id)
    // Wait a bit and retry - another request is generating
    return NextResponse.json({
      status: 'generating',
      message: 'Audio generation in progress',
      retry_after: 2,
    }, { status: 202 })
  }

  // Create generating record
  const { data: audioRecord, error: insertError } = await supabase
    .from('section_audio')
    .insert({
      section_id: sectionId,
      content_hash: contentHash,
      storage_path: storagePath,
      voice_id: voiceId,
      voice_name: voiceName,
      status: 'generating',
    })
    .select()
    .single()

  if (insertError || !audioRecord) {
    console.error('Failed to create audio record:', insertError)
    return NextResponse.json({ error: 'Failed to start audio generation' }, { status: 500 })
  }

  try {
    // Start streaming from ElevenLabs
    console.log(`[TTS] Starting ElevenLabs stream for section ${sectionId}, text length: ${fullText.length}`)
    const { stream, getBuffer } = await streamSpeech(fullText, voiceId)
    const estimatedDuration = estimateDuration(fullText)
    console.log(`[TTS] ElevenLabs stream ready, estimated duration: ${estimatedDuration}s`)

    // Set up background caching - this runs after the stream is consumed
    const cachePromise = getBuffer().then(async (buffer) => {
      try {
        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('audio')
          .upload(storagePath, buffer, {
            contentType: 'audio/mpeg',
            upsert: true,
          })

        if (uploadError) {
          throw new Error(`Storage upload failed: ${uploadError.message}`)
        }

        // Update record with success
        await supabase
          .from('section_audio')
          .update({
            status: 'ready',
            duration_seconds: estimatedDuration,
            file_size_bytes: buffer.length,
          })
          .eq('id', audioRecord.id)

        console.log(`[TTS] Cached audio for section ${sectionId} (${buffer.length} bytes)`)
      } catch (error) {
        console.error('[TTS] Background caching failed:', error)
        // Mark as failed so it can be regenerated
        await supabase
          .from('section_audio')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Caching failed',
          })
          .eq('id', audioRecord.id)
      }
    })

    // Don't await the cache promise - let it run in background
    // Edge runtime doesn't have waitUntil, but the promise will complete
    // as long as the process stays alive (which it does in Node.js runtime)
    cachePromise.catch(console.error)

    console.log('[TTS] Returning streaming response for section', sectionId)

    // Return streaming response
    return new Response(stream, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'X-Voice-Name': voiceName,
        'X-Duration-Estimate': String(estimatedDuration),
      },
    })
  } catch (error) {
    console.error('TTS streaming failed:', error)

    // Update record with failure
    await supabase
      .from('section_audio')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', audioRecord.id)

    return NextResponse.json({
      error: 'Audio generation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
