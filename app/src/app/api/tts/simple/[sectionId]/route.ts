import { createServiceClient, getUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ sectionId: string }>
}

// Simple TTS endpoint using direct HTTP call (no SDK)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { sectionId } = await params
    const { user } = await getUser()

    console.log(`[TTS Simple] GET /api/tts/simple/${sectionId}`)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      console.error('[TTS Simple] ELEVENLABS_API_KEY not set')
      return NextResponse.json({ error: 'TTS not configured' }, { status: 500 })
    }

    console.log('[TTS Simple] API key present, length:', apiKey.length)

    const supabase = createServiceClient()

    // Get section
    const { data: section } = await supabase
      .from('sections')
      .select('id, title, content_text, chapter_id, index')
      .eq('id', sectionId)
      .single()

    if (!section || !section.content_text) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    // Get chapter with title and book_id for ownership check
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
      .select('owner_id')
      .eq('id', chapter.book_id)
      .single()

    if (!book || book.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Build full text with chapter intro if first section

    const isFirstSection = section.index === 0
    const chapterNumber = (chapter?.index || 0) + 1
    const chapterIntro = isFirstSection && chapter?.title
      ? `Chapter ${chapterNumber}: ${chapter.title}.\n\n`
      : ''
    const sectionIntro = section.title ? `${section.title}.\n\n` : ''
    const fullText = `${chapterIntro}${sectionIntro}${section.content_text}`

    console.log('[TTS Simple] Generating audio for text length:', fullText.length)

    // Direct HTTP call to ElevenLabs
    const response = await fetch(
      'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM',
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: fullText,
          model_id: 'eleven_turbo_v2_5',
          output_format: 'mp3_44100_128',
        }),
      }
    )

    console.log('[TTS Simple] ElevenLabs response:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[TTS Simple] ElevenLabs error:', errorText)
      return NextResponse.json({
        error: 'ElevenLabs API error',
        status: response.status,
        details: errorText
      }, { status: 500 })
    }

    // Get the audio as array buffer
    const audioBuffer = await response.arrayBuffer()
    console.log('[TTS Simple] Got audio, size:', audioBuffer.byteLength)

    if (audioBuffer.byteLength < 100) {
      return NextResponse.json({
        error: 'ElevenLabs returned empty audio',
        size: audioBuffer.byteLength
      }, { status: 500 })
    }

    // Return audio directly
    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.byteLength),
      },
    })
  } catch (error) {
    console.error('[TTS Simple] Error:', error)
    return NextResponse.json({
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
