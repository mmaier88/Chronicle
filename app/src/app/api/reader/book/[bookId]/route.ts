/**
 * Reader Book API
 *
 * GET - Load full book content in paragraph-based reader format
 */

import { NextRequest } from 'next/server'
import { getUser, createServiceClient } from '@/lib/supabase/server'
import { success, apiError } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import { transformToReaderBook } from '@/lib/reader/engine'
import { Chapter, Section } from '@/types/chronicle'

interface RouteParams {
  params: Promise<{ bookId: string }>
}

// GET /api/reader/book/[bookId]
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { bookId } = await params

  const { user } = await getUser()
  if (!user) {
    return apiError.unauthorized()
  }

  const supabase = createServiceClient()

  // Get book
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('id, title, owner_id, status')
    .eq('id', bookId)
    .eq('owner_id', user.id)
    .single()

  if (bookError || !book) {
    return apiError.notFound('Book')
  }

  // Get chapters
  const { data: chapters, error: chaptersError } = await supabase
    .from('chapters')
    .select('*')
    .eq('book_id', bookId)
    .order('index', { ascending: true })

  if (chaptersError) {
    logger.error('Failed to load chapters', chaptersError, { bookId })
    return apiError.internal('Failed to load book chapters')
  }

  // Get sections for all chapters
  const chapterIds = chapters?.map((c: Chapter) => c.id) || []

  let sections: Section[] = []
  if (chapterIds.length > 0) {
    const { data: sectionsData, error: sectionsError } = await supabase
      .from('sections')
      .select('*')
      .in('chapter_id', chapterIds)
      .order('index', { ascending: true })

    if (sectionsError) {
      logger.error('Failed to load sections', sectionsError, { bookId })
      return apiError.internal('Failed to load book sections')
    }
    sections = sectionsData || []
  }

  // Group sections by chapter
  const chaptersWithSections = (chapters || []).map((chapter: Chapter) => ({
    ...chapter,
    sections: sections.filter((s: Section) => s.chapter_id === chapter.id),
  }))

  // Get user's name for author attribution
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const authorName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0]

  // Transform to reader format
  const readerBook = transformToReaderBook(book, chaptersWithSections, authorName)

  // Also get reading and audio progress
  const [{ data: readerProgress }, { data: audioProgress }] = await Promise.all([
    supabase
      .from('reader_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .single(),
    supabase
      .from('audio_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .single(),
  ])

  return success({
    book: readerBook,
    progress: readerProgress || null,
    audioProgress: audioProgress || null,
  })
}
