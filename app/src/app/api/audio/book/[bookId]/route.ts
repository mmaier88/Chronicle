import { NextRequest, NextResponse } from 'next/server'
import { createClient, getUser } from '@/lib/supabase/server'
import type { AudioSection, AudioChapter } from '@/lib/audio/types'

interface Section {
  id: string
  index: number
  title: string
  content_text: string | null
}

interface Chapter {
  id: string
  index: number
  title: string
  sections: Section[]
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params
    const { user } = await getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Fetch book
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, title, cover_url')
      .eq('id', bookId)
      .eq('owner_id', user.id)
      .single()

    if (bookError || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // Fetch chapters with sections
    const { data: chapters } = await supabase
      .from('chapters')
      .select('id, index, title, sections(id, index, title, content_text)')
      .eq('book_id', bookId)
      .order('index')

    const sortedChapters = (chapters || []).map(ch => ({
      ...ch,
      sections: (ch.sections || []).sort((a: Section, b: Section) => a.index - b.index)
    })) as Chapter[]

    // Build flat sections list for audio player
    const sections: AudioSection[] = sortedChapters.flatMap((chapter, chIdx) =>
      chapter.sections
        .filter(s => s.content_text) // Only sections with content
        .map((section, sIdx) => ({
          id: section.id,
          title: section.title,
          chapterTitle: chapter.title,
          chapterIndex: chIdx,
          sectionIndex: sIdx,
        }))
    )

    // Build chapters list
    const audioChapters: AudioChapter[] = []
    let currentChapterIndex = -1
    let sectionIdx = 0

    for (const section of sections) {
      if (section.chapterIndex !== currentChapterIndex) {
        currentChapterIndex = section.chapterIndex
        audioChapters.push({
          index: section.chapterIndex,
          title: section.chapterTitle,
          sectionStartIndex: sectionIdx,
          sectionCount: 1,
          estimatedDuration: 0,
        })
      } else {
        audioChapters[audioChapters.length - 1].sectionCount++
      }
      sectionIdx++
    }

    // Fetch saved audio progress
    const { data: savedProgress } = await supabase
      .from('audio_progress')
      .select('paragraph_id, audio_offset_ms, playback_speed')
      .eq('book_id', bookId)
      .eq('user_id', user.id)
      .single()

    let progress = null
    if (savedProgress && savedProgress.paragraph_id) {
      // Parse the section ID from our format: section:{sectionId}:{offsetMs}
      // or just use paragraph_id directly if it's a section ID
      const parts = savedProgress.paragraph_id.split(':')
      const sectionId = parts.length > 1 ? parts[1] : savedProgress.paragraph_id

      progress = {
        sectionId,
        offsetMs: savedProgress.audio_offset_ms || 0,
        playbackSpeed: savedProgress.playback_speed || 1,
      }
    }

    return NextResponse.json({
      book: {
        id: book.id,
        title: book.title,
        coverUrl: book.cover_url,
      },
      sections,
      chapters: audioChapters,
      savedProgress: progress,
    })
  } catch (error) {
    console.error('Error fetching audio book data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch book data' },
      { status: 500 }
    )
  }
}
