/**
 * Chronicle Reader Engine - Shared Types
 *
 * Cross-platform reading engine types used by:
 * - iOS app (SwiftUI)
 * - Mobile web (Safari / Chrome)
 * - Desktop web
 *
 * Core principle: Paragraph-based rendering with perfect resume.
 */

import { createHash } from 'crypto'

// =============================================================================
// CONTENT MODEL
// =============================================================================

/**
 * A single paragraph within a chapter.
 * The atomic unit of reading and audio synchronization.
 */
export interface Paragraph {
  /** Stable, content-derived hash ID */
  id: string
  /** The paragraph text content */
  text: string
  /** Audio offset in milliseconds (for sync) */
  audio_offset_ms?: number
  /** Section ID this paragraph belongs to */
  section_id: string
  /** Index within the section */
  index: number
}

/**
 * A chapter with its paragraphs
 */
export interface ReaderChapter {
  chapter_id: string
  chapter_index: number
  title: string
  paragraphs: Paragraph[]
  /** Raw section content for rendering (preserves original formatting) */
  raw_content: string
}

/**
 * Complete book content for the reader
 */
export interface ReaderBook {
  book_id: string
  title: string
  author?: string
  chapters: ReaderChapter[]
  total_paragraphs: number
  total_words: number
  estimated_read_minutes: number
  estimated_listen_minutes: number
}

// =============================================================================
// READING PROGRESS
// =============================================================================

/**
 * Reading progress persisted per user × book.
 * Enables perfect resume across sessions and devices.
 */
export interface ReaderProgress {
  user_id: string
  book_id: string
  /** Current chapter */
  chapter_id: string
  /** Current paragraph (content-derived hash) */
  paragraph_id: string
  /** Scroll offset within paragraph (platform-specific) */
  scroll_offset: number
  /** For mobile web: relative offset ratio (0-1 within paragraph) */
  scroll_offset_ratio?: number
  /** Last update timestamp */
  updated_at: string
}

/**
 * Audio playback progress persisted per user × book.
 */
export interface AudioProgress {
  user_id: string
  book_id: string
  /** Current paragraph being played */
  paragraph_id: string
  /** Offset within current audio segment */
  audio_offset_ms: number
  /** User's preferred playback speed */
  playback_speed: number
  /** Last update timestamp */
  updated_at: string
}

// =============================================================================
// TYPOGRAPHY SETTINGS
// =============================================================================

export type ReaderTheme = 'light' | 'dark' | 'warm-night'
export type ReaderFont = 'serif' | 'sans'

/**
 * User typography preferences.
 * Persisted per user, synced across all books and devices.
 */
export interface TypographySettings {
  user_id: string
  /** Font size in points (default: 17) */
  font_size: number
  /** Line height multiplier (default: 1.5) */
  line_height: number
  /** Font family preference */
  font_family: ReaderFont
  /** Color theme */
  theme: ReaderTheme
  /** Last update timestamp */
  updated_at: string
}

/**
 * Default typography settings
 * Matches old reader: fontSize 1.125rem (18px), lineHeight 1.8
 */
export const DEFAULT_TYPOGRAPHY: Omit<TypographySettings, 'user_id' | 'updated_at'> = {
  font_size: 18,
  line_height: 1.8,
  font_family: 'serif',
  theme: 'dark',
}

// =============================================================================
// READER STATE
// =============================================================================

/**
 * Complete reader state (runtime, not persisted)
 */
export interface ReaderState {
  /** The book content */
  book: ReaderBook | null
  /** Current reading progress */
  progress: ReaderProgress | null
  /** Current audio progress */
  audioProgress: AudioProgress | null
  /** Typography settings */
  typography: TypographySettings
  /** Is audio currently playing? */
  isPlaying: boolean
  /** Is content loading? */
  isLoading: boolean
  /** Current mode */
  mode: 'reading' | 'listening'
}

// =============================================================================
// PARAGRAPH UTILITIES
// =============================================================================

/**
 * Generate a stable, content-derived paragraph ID.
 * Used for resume and audio synchronization.
 */
export function generateParagraphId(
  sectionId: string,
  paragraphIndex: number,
  text: string
): string {
  // Use first 50 chars of text + section + index for stability
  const content = `${sectionId}:${paragraphIndex}:${text.slice(0, 50)}`
  return createHash('md5').update(content).digest('hex').slice(0, 12)
}

/**
 * Parse markdown/text content into paragraphs.
 * Splits on newlines (single or double), filters empty.
 */
export function parseIntoParagraphs(
  content: string,
  sectionId: string
): Paragraph[] {
  if (!content || !content.trim()) return []

  // Split on any newline sequence (single or double)
  // This handles both \n\n and \n paragraph breaks
  const rawParagraphs = content
    .split(/\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)

  return rawParagraphs.map((text, index) => ({
    id: generateParagraphId(sectionId, index, text),
    text,
    section_id: sectionId,
    index,
  }))
}

/**
 * Calculate word count for text
 */
export function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length
}

/**
 * Estimate reading time in minutes (~250 words/min)
 */
export function estimateReadTime(wordCount: number): number {
  return Math.ceil(wordCount / 250)
}

/**
 * Estimate listening time in minutes (~150 words/min)
 */
export function estimateListenTime(wordCount: number): number {
  return Math.ceil(wordCount / 150)
}

// =============================================================================
// PROGRESS MATCHING (for regenerated content)
// =============================================================================

/**
 * Find the nearest matching paragraph when content has changed.
 * Uses fuzzy matching on text content.
 */
export function findNearestParagraph(
  targetId: string,
  targetText: string | undefined,
  paragraphs: Paragraph[]
): Paragraph | null {
  if (paragraphs.length === 0) return null

  // First try exact ID match
  const exactMatch = paragraphs.find(p => p.id === targetId)
  if (exactMatch) return exactMatch

  // If we have the original text, try fuzzy matching
  if (targetText) {
    const targetWords = new Set(targetText.toLowerCase().split(/\s+/))

    let bestMatch: Paragraph | null = null
    let bestScore = 0

    for (const paragraph of paragraphs) {
      const paragraphWords = new Set(paragraph.text.toLowerCase().split(/\s+/))
      const intersection = [...targetWords].filter(w => paragraphWords.has(w))
      const score = intersection.length / Math.max(targetWords.size, paragraphWords.size)

      if (score > bestScore && score > 0.3) {
        bestScore = score
        bestMatch = paragraph
      }
    }

    if (bestMatch) return bestMatch
  }

  // Fall back to first paragraph
  return paragraphs[0]
}
