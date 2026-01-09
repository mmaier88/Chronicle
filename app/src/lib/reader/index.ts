/**
 * Chronicle Reader Engine
 *
 * Cross-platform reading engine exports.
 */

// Types
export type {
  Paragraph,
  ReaderChapter,
  ReaderBook,
  ReaderProgress,
  AudioProgress,
  TypographySettings,
  ReaderTheme,
  ReaderFont,
  ReaderState,
} from './types'

// Constants
export { DEFAULT_TYPOGRAPHY } from './types'

// Utilities
export {
  generateParagraphId,
  parseIntoParagraphs,
  countWords,
  estimateReadTime,
  estimateListenTime,
  findNearestParagraph,
} from './types'

// Engine
export {
  transformToReaderBook,
  calculateProgressPercentage,
  calculateTimeRemaining,
  findResumePosition,
  getParagraphAudioInfo,
  findParagraphForAudioPosition,
  getNextChapter,
  getPreviousChapter,
  getChapterByIndex,
  debounce,
  PROGRESS_SAVE_DEBOUNCE_MS,
  PROGRESS_SAVE_ON_BACKGROUND,
} from './engine'

export type { ResumeResult } from './engine'
