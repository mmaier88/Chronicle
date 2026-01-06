import { createServiceClient, getUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  generateSpeechChunked,
  computeContentHash,
  estimateDuration,
  DEFAULT_VOICE_ID,
  BOOK_VOICES,
} from '@/lib/elevenlabs/client'

interface RouteParams {
  params: Promise<{ sectionId: string }>
}

// GET: Get or generate audio for a section
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { sectionId } = await params
  const { user, isDevUser } = await getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
  // Only read chapter intro on the first section of each chapter
  const isFirstSection = section.index === 0
  const chapterNumber = (chapter.index || 0) + 1
  const chapterIntro = isFirstSection && chapter.title
    ? `Chapter ${chapterNumber}: ${chapter.title}.\n\n`
    : ''
  const sectionIntro = section.title ? `${section.title}.\n\n` : ''
  const fullText = `${chapterIntro}${sectionIntro}${section.content_text}`

  const contentHash = computeContentHash(fullText) // Hash includes titles
  const voiceId = book.audio_voice_id || DEFAULT_VOICE_ID
  const voiceName = BOOK_VOICES.find(v => v.id === voiceId)?.name || 'Unknown'

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
      .createSignedUrl(existingAudio.storage_path, 3600) // 1 hour expiry

    if (signedUrl) {
      return NextResponse.json({
        status: 'ready',
        audio_url: signedUrl.signedUrl,
        duration_seconds: existingAudio.duration_seconds,
        voice_name: existingAudio.voice_name,
      })
    }
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
      status: pendingAudio.status,
      message: 'Audio generation in progress',
    })
  }

  // Create pending record
  const { data: audioRecord, error: insertError } = await supabase
    .from('section_audio')
    .insert({
      section_id: sectionId,
      content_hash: contentHash,
      storage_path: `${user.id}/${sectionId}/${contentHash}.mp3`,
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
    // Generate audio with chapter/section titles included
    const audioBuffer = await generateSpeechChunked(fullText, voiceId)
    const duration = estimateDuration(fullText)

    // Upload to Supabase Storage
    const storagePath = `${user.id}/${sectionId}/${contentHash}.mp3`
    const { error: uploadError } = await supabase.storage
      .from('audio')
      .upload(storagePath, audioBuffer, {
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
        duration_seconds: duration,
        file_size_bytes: audioBuffer.length,
      })
      .eq('id', audioRecord.id)

    // Get signed URL
    const { data: signedUrl } = await supabase.storage
      .from('audio')
      .createSignedUrl(storagePath, 3600)

    return NextResponse.json({
      status: 'ready',
      audio_url: signedUrl?.signedUrl,
      duration_seconds: duration,
      voice_name: voiceName,
    })
  } catch (error) {
    console.error('TTS generation failed:', error)

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
