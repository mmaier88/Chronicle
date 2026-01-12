import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_VOICE_ID } from '@/lib/elevenlabs/client'

const PREBUILD_SECTIONS_COUNT = 3

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

/**
 * Pre-build TTS for the first few sections of a book
 *
 * Called internally during book finalization to ensure audio is ready
 * when the user opens the book for the first time.
 *
 * Uses CRON_SECRET for authentication (server-to-server call)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify internal auth
    const cronSecret = request.headers.get('x-cron-secret')
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { bookId, userId } = await request.json()

    if (!bookId || !userId) {
      return NextResponse.json({ error: 'Missing bookId or userId' }, { status: 400 })
    }

    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      console.error('[TTS Prebuild] ELEVENLABS_API_KEY not set')
      return NextResponse.json({ error: 'TTS not configured' }, { status: 500 })
    }

    const supabase = createServiceClient()

    console.log(`[TTS Prebuild] Starting for book ${bookId}, user ${userId}`)

    // Get chapters ordered by index
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('id, title, index')
      .eq('book_id', bookId)
      .order('index', { ascending: true })

    if (chaptersError || !chapters?.length) {
      console.error('[TTS Prebuild] No chapters found', chaptersError)
      return NextResponse.json({ error: 'No chapters found' }, { status: 404 })
    }

    // Get sections for all chapters
    const chapterIds = chapters.map(c => c.id)
    const { data: sections, error: sectionsError } = await supabase
      .from('sections')
      .select('id, title, content_text, chapter_id, index')
      .in('chapter_id', chapterIds)
      .order('index', { ascending: true })

    if (sectionsError || !sections?.length) {
      console.error('[TTS Prebuild] No sections found', sectionsError)
      return NextResponse.json({ error: 'No sections found' }, { status: 404 })
    }

    // Create chapter lookup for ordering
    const chapterIndexMap = new Map(chapters.map(c => [c.id, { index: c.index, title: c.title }]))

    // Sort sections by chapter index, then section index
    const sortedSections = [...sections].sort((a, b) => {
      const chapterA = chapterIndexMap.get(a.chapter_id)
      const chapterB = chapterIndexMap.get(b.chapter_id)
      if (!chapterA || !chapterB) return 0
      if (chapterA.index !== chapterB.index) {
        return chapterA.index - chapterB.index
      }
      return a.index - b.index
    })

    // Take first N sections
    const sectionsToProcess = sortedSections.slice(0, PREBUILD_SECTIONS_COUNT)

    console.log(`[TTS Prebuild] Processing ${sectionsToProcess.length} sections`)

    // Get user's voice preference
    const { data: userPrefs } = await supabase
      .from('user_preferences')
      .select('voice_id')
      .eq('user_id', userId)
      .single()

    const voiceId = userPrefs?.voice_id || DEFAULT_VOICE_ID

    // Process sections sequentially (to avoid rate limits)
    const results: { sectionId: string; status: string }[] = []

    for (const section of sectionsToProcess) {
      if (!section.content_text) {
        results.push({ sectionId: section.id, status: 'skipped_no_content' })
        continue
      }

      const chapter = chapterIndexMap.get(section.chapter_id)
      if (!chapter) {
        results.push({ sectionId: section.id, status: 'skipped_no_chapter' })
        continue
      }

      // Build full text with chapter intro if first section
      const isFirstSection = section.index === 0
      const chapterNumber = (chapter.index || 0) + 1
      const chapterIntro = isFirstSection && chapter.title
        ? `Chapter ${chapterNumber}: ${chapter.title}.\n\n`
        : ''
      const sectionIntro = section.title ? `${section.title}.\n\n` : ''
      const fullText = `${chapterIntro}${sectionIntro}${section.content_text}`

      // Check if already cached
      const contentHash = hashContent(fullText)
      const storagePath = `${userId}/${section.id}/${voiceId}/${contentHash}.mp3`

      const { data: existingFile } = await supabase.storage
        .from('audio')
        .list(`${userId}/${section.id}/${voiceId}`, {
          search: `${contentHash}.mp3`
        })

      if (existingFile && existingFile.length > 0 && existingFile[0].name === `${contentHash}.mp3`) {
        console.log(`[TTS Prebuild] Section ${section.id} already cached`)
        results.push({ sectionId: section.id, status: 'already_cached' })
        continue
      }

      // Generate audio from ElevenLabs
      console.log(`[TTS Prebuild] Generating audio for section ${section.id}`)

      try {
        const elevenLabsResponse = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
          {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'xi-api-key': apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: fullText,
              model_id: 'eleven_turbo_v2_5',
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
              },
            }),
          }
        )

        if (!elevenLabsResponse.ok) {
          const errorText = await elevenLabsResponse.text()
          console.error(`[TTS Prebuild] ElevenLabs error for section ${section.id}:`, errorText)
          results.push({ sectionId: section.id, status: 'elevenlabs_error' })
          continue
        }

        // Read full response
        const audioBuffer = await elevenLabsResponse.arrayBuffer()
        const audioData = new Uint8Array(audioBuffer)

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('audio')
          .upload(storagePath, audioData, {
            contentType: 'audio/mpeg',
            upsert: true
          })

        if (uploadError) {
          console.error(`[TTS Prebuild] Upload error for section ${section.id}:`, uploadError)
          results.push({ sectionId: section.id, status: 'upload_error' })
          continue
        }

        console.log(`[TTS Prebuild] Section ${section.id} cached successfully`)
        results.push({ sectionId: section.id, status: 'generated' })

      } catch (err) {
        console.error(`[TTS Prebuild] Error processing section ${section.id}:`, err)
        results.push({ sectionId: section.id, status: 'error' })
      }
    }

    console.log(`[TTS Prebuild] Completed for book ${bookId}:`, results)

    return NextResponse.json({
      success: true,
      bookId,
      processed: results
    })

  } catch (error) {
    console.error('[TTS Prebuild] Error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
