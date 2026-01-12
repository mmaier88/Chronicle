import { createServiceClient, getUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  streamSpeech,
  estimateDuration,
  DEFAULT_VOICE_ID,
  BOOK_VOICES,
} from '@/lib/elevenlabs/client'

interface RouteParams {
  params: Promise<{ sectionId: string }>
}

// GET: Stream audio directly from ElevenLabs (no caching)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { sectionId } = await params
    const { user } = await getUser()

    console.log(`[TTS Stream] GET /api/tts/stream/${sectionId}`)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    // Get section
    const { data: section, error: sectionError } = await supabase
      .from('sections')
      .select('id, title, content_text, chapter_id, index')
      .eq('id', sectionId)
      .single()

    if (sectionError || !section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    // Get chapter with book
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

    if (!book || book.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!section.content_text) {
      return NextResponse.json({ error: 'Section has no content' }, { status: 400 })
    }

    // Build text
    const isFirstSection = section.index === 0
    const chapterNumber = (chapter.index || 0) + 1
    const chapterIntro = isFirstSection && chapter.title
      ? `Chapter ${chapterNumber}: ${chapter.title}.\n\n`
      : ''
    const sectionIntro = section.title ? `${section.title}.\n\n` : ''
    const fullText = `${chapterIntro}${sectionIntro}${section.content_text}`

    const voiceId = book.audio_voice_id || DEFAULT_VOICE_ID
    const voiceName = BOOK_VOICES.find(v => v.id === voiceId)?.name || 'Unknown'

    console.log(`[TTS Stream] Starting stream for section ${sectionId}, text length: ${fullText.length}`)

    // Stream directly from ElevenLabs - no caching
    const { stream } = await streamSpeech(fullText, voiceId)
    const estimatedDuration = estimateDuration(fullText)

    console.log(`[TTS Stream] Stream ready, returning response`)

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
    console.error('[TTS Stream] Error:', error)
    return NextResponse.json({
      error: 'Audio generation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
