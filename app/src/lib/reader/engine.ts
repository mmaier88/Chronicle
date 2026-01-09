/**
 * Chronicle Reader Engine
 *
 * Transforms book/chapter/section data into paragraph-based format.
 * Handles progress persistence and resume logic.
 */

import {
  ReaderBook,
  ReaderChapter,
  Paragraph,
  ReaderProgress,
  AudioProgress,
  TypographySettings,
  DEFAULT_TYPOGRAPHY,
  parseIntoParagraphs,
  countWords,
  estimateReadTime,
  estimateListenTime,
  findNearestParagraph,
} from './types'
import { Chapter, Section } from '@/types/chronicle'

// =============================================================================
// BOOK TRANSFORMATION
// =============================================================================

interface RawBookData {
  id: string
  title: string
  owner_id: string
}

interface RawChapterData extends Chapter {
  sections: Section[]
}

/**
 * Transform raw database book data into ReaderBook format.
 * Converts sections into paragraph arrays.
 */
export function transformToReaderBook(
  book: RawBookData,
  chapters: RawChapterData[],
  authorName?: string
): ReaderBook {
  let totalParagraphs = 0
  let totalWords = 0

  const readerChapters: ReaderChapter[] = chapters
    .sort((a, b) => a.index - b.index)
    .map(chapter => {
      const paragraphs: Paragraph[] = []

      // Sort sections by index
      const sortedSections = [...chapter.sections].sort((a, b) => a.index - b.index)

      for (const section of sortedSections) {
        const content = section.content_text || ''
        const sectionParagraphs = parseIntoParagraphs(content, section.id)
        paragraphs.push(...sectionParagraphs)
        totalWords += countWords(content)
      }

      totalParagraphs += paragraphs.length

      return {
        chapter_id: chapter.id,
        chapter_index: chapter.index,
        title: chapter.title,
        paragraphs,
      }
    })

  return {
    book_id: book.id,
    title: book.title,
    author: authorName,
    chapters: readerChapters,
    total_paragraphs: totalParagraphs,
    total_words: totalWords,
    estimated_read_minutes: estimateReadTime(totalWords),
    estimated_listen_minutes: estimateListenTime(totalWords),
  }
}

// =============================================================================
// PROGRESS CALCULATIONS
// =============================================================================

/**
 * Calculate reading progress percentage based on current position.
 */
export function calculateProgressPercentage(
  book: ReaderBook,
  currentChapterId: string,
  currentParagraphId: string
): number {
  if (!book.chapters.length) return 0

  let paragraphsSeen = 0
  let found = false

  for (const chapter of book.chapters) {
    for (const paragraph of chapter.paragraphs) {
      paragraphsSeen++
      if (paragraph.id === currentParagraphId && chapter.chapter_id === currentChapterId) {
        found = true
        break
      }
    }
    if (found) break
  }

  if (!found) return 0
  return Math.round((paragraphsSeen / book.total_paragraphs) * 100)
}

/**
 * Calculate estimated time remaining based on current position.
 */
export function calculateTimeRemaining(
  book: ReaderBook,
  currentChapterId: string,
  currentParagraphId: string,
  mode: 'reading' | 'listening'
): number {
  const progressPct = calculateProgressPercentage(book, currentChapterId, currentParagraphId)
  const remainingPct = 100 - progressPct
  const totalMinutes = mode === 'reading'
    ? book.estimated_read_minutes
    : book.estimated_listen_minutes

  return Math.ceil((remainingPct / 100) * totalMinutes)
}

// =============================================================================
// RESUME LOGIC
// =============================================================================

export interface ResumeResult {
  chapter: ReaderChapter
  paragraph: Paragraph
  scrollOffset: number
  scrollOffsetRatio: number
  wasExactMatch: boolean
}

/**
 * Find the resume position for a book.
 * Handles cases where content has been regenerated.
 */
export function findResumePosition(
  book: ReaderBook,
  progress: ReaderProgress | null
): ResumeResult | null {
  if (!book.chapters.length) return null

  // No progress - start at beginning
  if (!progress) {
    const firstChapter = book.chapters[0]
    const firstParagraph = firstChapter.paragraphs[0]
    if (!firstParagraph) return null

    return {
      chapter: firstChapter,
      paragraph: firstParagraph,
      scrollOffset: 0,
      scrollOffsetRatio: 0,
      wasExactMatch: false,
    }
  }

  // Find the chapter
  const targetChapter = book.chapters.find(c => c.chapter_id === progress.chapter_id)

  if (targetChapter && targetChapter.paragraphs.length > 0) {
    // Try to find exact paragraph match
    const exactParagraph = targetChapter.paragraphs.find(p => p.id === progress.paragraph_id)

    if (exactParagraph) {
      return {
        chapter: targetChapter,
        paragraph: exactParagraph,
        scrollOffset: progress.scroll_offset,
        scrollOffsetRatio: progress.scroll_offset_ratio || 0,
        wasExactMatch: true,
      }
    }

    // Paragraph not found - try fuzzy match within chapter
    const nearestParagraph = findNearestParagraph(
      progress.paragraph_id,
      undefined, // We don't have the original text
      targetChapter.paragraphs
    )

    if (nearestParagraph) {
      return {
        chapter: targetChapter,
        paragraph: nearestParagraph,
        scrollOffset: 0,
        scrollOffsetRatio: 0,
        wasExactMatch: false,
      }
    }
  }

  // Chapter not found or empty - fall back to beginning
  const firstChapter = book.chapters[0]
  const firstParagraph = firstChapter.paragraphs[0]

  if (!firstParagraph) return null

  return {
    chapter: firstChapter,
    paragraph: firstParagraph,
    scrollOffset: 0,
    scrollOffsetRatio: 0,
    wasExactMatch: false,
  }
}

// =============================================================================
// AUDIO COORDINATION
// =============================================================================

/**
 * Map a paragraph to its audio section for playback.
 */
export function getParagraphAudioInfo(
  paragraph: Paragraph
): { sectionId: string; paragraphIndex: number } {
  return {
    sectionId: paragraph.section_id,
    paragraphIndex: paragraph.index,
  }
}

/**
 * Find the paragraph that corresponds to an audio position.
 */
export function findParagraphForAudioPosition(
  book: ReaderBook,
  sectionId: string,
  offsetMs: number
): Paragraph | null {
  for (const chapter of book.chapters) {
    for (const paragraph of chapter.paragraphs) {
      if (paragraph.section_id === sectionId) {
        // For now, return the first paragraph of the section
        // V2 will have precise audio offsets per paragraph
        if (paragraph.index === 0) {
          return paragraph
        }
      }
    }
  }
  return null
}

// =============================================================================
// CHAPTER NAVIGATION
// =============================================================================

/**
 * Get the next chapter after the current one.
 */
export function getNextChapter(
  book: ReaderBook,
  currentChapterId: string
): ReaderChapter | null {
  const currentIndex = book.chapters.findIndex(c => c.chapter_id === currentChapterId)
  if (currentIndex === -1 || currentIndex >= book.chapters.length - 1) return null
  return book.chapters[currentIndex + 1]
}

/**
 * Get the previous chapter before the current one.
 */
export function getPreviousChapter(
  book: ReaderBook,
  currentChapterId: string
): ReaderChapter | null {
  const currentIndex = book.chapters.findIndex(c => c.chapter_id === currentChapterId)
  if (currentIndex <= 0) return null
  return book.chapters[currentIndex - 1]
}

/**
 * Get chapter by index (0-based).
 */
export function getChapterByIndex(
  book: ReaderBook,
  index: number
): ReaderChapter | null {
  return book.chapters[index] || null
}

// =============================================================================
// SCROLL POSITION UTILITIES
// =============================================================================

/**
 * Debounce function for scroll saving.
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Progress save configuration.
 */
export const PROGRESS_SAVE_DEBOUNCE_MS = 3000 // Save every 3 seconds while scrolling
export const PROGRESS_SAVE_ON_BACKGROUND = true // Save immediately on app background
