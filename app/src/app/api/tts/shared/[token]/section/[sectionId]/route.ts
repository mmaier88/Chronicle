import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  streamSpeech,
  computeContentHash,
  estimateDuration,
  DEFAULT_VOICE_ID,
  BOOK_VOICES,
} from '@/lib/elevenlabs/client'

interface RouteParams {
  params: Promise<{ token: string; sectionId: string }>
}

// GET: Get or stream audio for a shared section
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { token, sectionId } = await params

  // Check if client wants streaming (default) or JSON metadata
  const wantsMetadata = request.nextUrl.searchParams.get('metadata') === 'true'

  const supabase = createServiceClient()

  // Validate share token has access to this section
  const { data: isValid, error: validationError } = await supabase.rpc(
    'validate_share_token',
    { token, section_uuid: sectionId }
  )

  if (validationError || !isValid) {
    return NextResponse.json(
      { error: 'Invalid share token or section access denied' },
      { status: 403 }
    )
  }

  // Get section with title and index
  const { data: section, error: sectionError } = await supabase
    .from('sections')
    .select('id, title, content_text, chapter_id, index')
    .eq('id', sectionId)
    .single()

  if (sectionError || !section) {
    return NextResponse.json({ error: 'Section not found' }, { status: 404 })
  }

  // Get chapter with title, index and book for voice settings
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

  if (!section.content_text) {
    return NextResponse.json({ error: 'Section has no content' }, { status: 400 })
  }

  // Build full text with chapter and section titles for narration
  const isFirstSection = section.index === 0
  const chapterNumber = (chapter.index || 0) + 1
  const chapterIntro =
    isFirstSection && chapter.title ? `Chapter ${chapterNumber}: ${chapter.title}.\n\n` : ''
  const sectionIntro = section.title ? `${section.title}.\n\n` : ''
  const fullText = `${chapterIntro}${sectionIntro}${section.content_text}`

  const contentHash = computeContentHash(fullText)
  const voiceId = book.audio_voice_id || DEFAULT_VOICE_ID
  const voiceName = BOOK_VOICES.find((v) => v.id === voiceId)?.name || 'Unknown'
  const storagePath = `${book.owner_id}/${sectionId}/${contentHash}.mp3`

  // Check if we already have cached audio
  const { data: existingAudio } = await supabase
    .from('section_audio')
    .select('*')
    .eq('section_id', sectionId)
    .eq('content_hash', contentHash)
    .eq('status', 'ready')
    .single()

  if (existingAudio) {
    // Update last_accessed_at for cleanup tracking
    await supabase.rpc('touch_section_audio', { audio_id: existingAudio.id })

    // Get signed URL for the audio file
    const { data: signedUrl } = await supabase.storage
      .from('audio')
      .createSignedUrl(existingAudio.storage_path, 3600)

    if (signedUrl) {
      // Return JSON metadata if requested
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
    return NextResponse.json({
      status: 'streaming',
      stream_url: `/api/tts/shared/${token}/section/${sectionId}`,
      duration_seconds: estimateDuration(fullText),
      voice_name: voiceName,
      cached: false,
    })
  }

  // Check if generation is in progress
  const { data: pendingAudio } = await supabase
    .from('section_audio')
    .select('*')
    .eq('section_id', sectionId)
    .in('status', ['pending', 'generating'])
    .single()

  if (pendingAudio) {
    return NextResponse.json({
      status: 'generating',
      message: 'Audio generation in progress',
      retry_after: 2,
    }, { status: 202 })
  }

  // Create generating record (use book owner's ID for storage path)
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
    return NextResponse.json(
      { error: 'Failed to start audio generation' },
      { status: 500 }
    )
  }

  try {
    // Start streaming from ElevenLabs
    const { stream, getBuffer } = await streamSpeech(fullText, voiceId)
    const estimatedDuration = estimateDuration(fullText)

    // Set up background caching
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

        console.log(`[TTS Shared] Cached audio for section ${sectionId} (${buffer.length} bytes)`)
      } catch (error) {
        console.error('[TTS Shared] Background caching failed:', error)
        await supabase
          .from('section_audio')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Caching failed',
          })
          .eq('id', audioRecord.id)
      }
    })

    // Don't await - let it run in background
    cachePromise.catch(console.error)

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

    return NextResponse.json(
      {
        error: 'Audio generation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
