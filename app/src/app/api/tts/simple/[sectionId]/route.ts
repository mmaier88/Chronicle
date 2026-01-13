import { createServiceClient, getUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { parseAPIError, formatErrorForLog } from '@/lib/errors/api-errors'
import { DEFAULT_VOICE_ID, BOOK_VOICES } from '@/lib/elevenlabs/client'

interface RouteParams {
  params: Promise<{ sectionId: string }>
}

// Hash content to create cache key
function hashContent(text: string): string {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

// Estimate duration from text length
function estimateDuration(text: string): number {
  const wordsPerMinute = 150
  const words = text.split(/\s+/).length
  return Math.ceil((words / wordsPerMinute) * 60)
}

/**
 * Hybrid TTS endpoint: Cache + Streaming
 *
 * Flow:
 * 1. Check Supabase Storage for cached audio
 * 2. If cached → redirect to signed URL (instant playback)
 * 3. If not cached → stream from ElevenLabs to client while caching in background
 *
 * This gives the best of both worlds:
 * - Cached content plays instantly
 * - Uncached content streams with minimal delay
 * - Cache is populated automatically for next time
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { sectionId } = await params
    const { user } = await getUser()

    console.log(`[TTS] GET /api/tts/simple/${sectionId}`)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      console.error('[TTS] ELEVENLABS_API_KEY not set')
      return NextResponse.json({
        error: 'Audio service not configured',
        code: 'TTS_NOT_CONFIGURED',
        userMessage: 'Audio generation is not available. Please contact support.',
      }, { status: 500 })
    }

    const supabase = createServiceClient()

    // Get section with chapter info
    const { data: section, error: sectionError } = await supabase
      .from('sections')
      .select('id, title, content_text, chapter_id, index')
      .eq('id', sectionId)
      .single()

    if (sectionError || !section || !section.content_text) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    // Get chapter for ownership check
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

    // Get user's voice preference
    const { data: userPrefs } = await supabase
      .from('user_preferences')
      .select('voice_id')
      .eq('user_id', user.id)
      .single()

    const voiceId = userPrefs?.voice_id || DEFAULT_VOICE_ID

    // Build full text with chapter intro if first section
    const isFirstSection = section.index === 0
    const chapterNumber = (chapter.index || 0) + 1
    const chapterIntro = isFirstSection && chapter.title
      ? `Chapter ${chapterNumber}: ${chapter.title}.\n\n`
      : ''
    const sectionIntro = section.title ? `${section.title}.\n\n` : ''
    const fullText = `${chapterIntro}${sectionIntro}${section.content_text}`

    // Create cache path based on content hash AND voice
    const contentHash = hashContent(fullText)
    // Include voice in path to support voice switching
    const storagePath = `${user.id}/${sectionId}/${voiceId}/${contentHash}.mp3`

    // ============================
    // STEP 1: Check cache
    // ============================
    console.log('[TTS] Checking cache:', storagePath)
    const { data: existingFile } = await supabase.storage
      .from('audio')
      .list(`${user.id}/${sectionId}/${voiceId}`, {
        search: `${contentHash}.mp3`
      })

    if (existingFile && existingFile.length > 0 && existingFile[0].name === `${contentHash}.mp3`) {
      // Cache HIT - redirect to signed URL for instant playback
      console.log('[TTS] Cache HIT - returning signed URL')
      const { data: signedUrl } = await supabase.storage
        .from('audio')
        .createSignedUrl(storagePath, 3600)

      if (signedUrl?.signedUrl) {
        return NextResponse.redirect(signedUrl.signedUrl)
      }
    }

    // ============================
    // STEP 2: Cache MISS - Stream from ElevenLabs
    // ============================
    console.log('[TTS] Cache MISS - streaming from ElevenLabs')
    console.log('[TTS] Text length:', fullText.length, 'characters')

    // Request streaming response from ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: fullText,
          model_id: 'eleven_multilingual_v2',
          output_format: 'mp3_44100_128',
        }),
      }
    )

    console.log('[TTS] ElevenLabs response:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[TTS] ElevenLabs error:', errorText)

      // Parse the error for user-friendly message
      const errorInfo = parseAPIError('elevenlabs', response.status, errorText)
      console.error(formatErrorForLog(errorInfo))

      return NextResponse.json({
        error: errorInfo.userMessage,
        code: errorInfo.type,
        service: 'elevenlabs',
        actionRequired: errorInfo.actionRequired,
      }, { status: response.status === 401 ? 402 : 500 })
    }

    if (!response.body) {
      return NextResponse.json({
        error: 'No audio stream received',
        code: 'TTS_NO_STREAM',
      }, { status: 500 })
    }

    // ============================
    // STEP 3: Stream to client while buffering for cache
    // ============================
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let totalSize = 0

    // Create a transform stream that:
    // 1. Passes data through to the client immediately
    // 2. Buffers it for caching when complete
    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read()

            if (done) {
              controller.close()

              // Stream complete - cache the audio in background
              if (totalSize > 100) {
                const fullBuffer = new Uint8Array(totalSize)
                let offset = 0
                for (const chunk of chunks) {
                  fullBuffer.set(chunk, offset)
                  offset += chunk.length
                }

                // Cache to Supabase Storage (fire and forget)
                supabase.storage
                  .from('audio')
                  .upload(storagePath, fullBuffer.buffer, {
                    contentType: 'audio/mpeg',
                    upsert: true,
                  })
                  .then(({ error }) => {
                    if (error) {
                      console.error('[TTS] Cache save failed:', error.message)
                    } else {
                      console.log('[TTS] Cached audio to:', storagePath, `(${totalSize} bytes)`)

                      // Also save to section_audio table for tracking
                      const voiceName = BOOK_VOICES.find(v => v.id === voiceId)?.name || 'Unknown'
                      return supabase.from('section_audio').upsert({
                        section_id: sectionId,
                        content_hash: contentHash,
                        storage_path: storagePath,
                        voice_id: voiceId,
                        voice_name: voiceName,
                        status: 'ready',
                        duration_seconds: estimateDuration(fullText),
                        file_size_bytes: totalSize,
                      }, {
                        onConflict: 'section_id,content_hash'
                      })
                    }
                  })
                  .catch(err => console.error('[TTS] Background cache error:', err))
              }
              break
            }

            // Pass chunk to client immediately
            controller.enqueue(value)

            // Buffer for caching
            chunks.push(value)
            totalSize += value.length
          }
        } catch (error) {
          console.error('[TTS] Stream error:', error)
          controller.error(error)
        }
      },
      cancel() {
        reader.cancel()
      }
    })

    // Return streaming response - client gets audio immediately as it generates
    return new Response(stream, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache', // Don't cache stream responses
      },
    })
  } catch (error) {
    console.error('[TTS] Error:', error)
    return NextResponse.json({
      error: 'Audio generation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
