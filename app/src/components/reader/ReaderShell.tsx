'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Headphones, BookOpen, ChevronDown } from 'lucide-react'
import { Paragraph, ChapterHeader, ChapterDivider } from './Paragraph'
import { TypographyControls, TypographyButton } from './TypographyControls'
import type {
  ReaderBook,
  ReaderProgress,
  AudioProgress,
  TypographySettings,
  ReaderChapter,
  Paragraph as ParagraphType,
  ReaderTheme,
} from '@/lib/reader'
import {
  DEFAULT_TYPOGRAPHY,
  calculateProgressPercentage,
  calculateTimeRemaining,
  findResumePosition,
  debounce,
  PROGRESS_SAVE_DEBOUNCE_MS,
} from '@/lib/reader'

interface ReaderShellProps {
  book: ReaderBook
  initialProgress: ReaderProgress | null
  initialAudioProgress: AudioProgress | null
  initialTypography: TypographySettings | null
  onSaveProgress: (progress: Omit<ReaderProgress, 'user_id' | 'updated_at'>) => Promise<void>
  onSaveTypography: (settings: Partial<TypographySettings>) => Promise<void>
  onListenFromHere?: (paragraphId: string, sectionId: string) => void
  onBack: () => void
}

/**
 * Chronicle Reader Shell
 *
 * The main web reader component.
 * Implements vertical scroll, perfect resume, typography controls.
 */
export function ReaderShell({
  book,
  initialProgress,
  initialAudioProgress,
  initialTypography,
  onSaveProgress,
  onSaveTypography,
  onListenFromHere,
  onBack,
}: ReaderShellProps) {
  // State
  const [typography, setTypography] = useState<TypographySettings>(
    initialTypography || { user_id: '', ...DEFAULT_TYPOGRAPHY, updated_at: '' }
  )
  const [showControls, setShowControls] = useState(false)
  const [showTypography, setShowTypography] = useState(false)
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null)
  const [currentParagraphId, setCurrentParagraphId] = useState<string | null>(null)
  const [highlightedParagraphId, setHighlightedParagraphId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const paragraphRefs = useRef<Map<string, HTMLParagraphElement>>(new Map())

  // Theme colors
  const themeColors: Record<ReaderTheme, { bg: string; text: string; textSecondary: string }> = {
    light: { bg: '#FAF6ED', text: '#1A1A1A', textSecondary: '#666666' },
    dark: { bg: '#0F172A', text: '#FAF6ED', textSecondary: '#94A3B8' },
    'warm-night': { bg: '#1C1410', text: '#E8D5C4', textSecondary: '#A89080' },
  }

  const colors = themeColors[typography.theme]

  // Debounced save progress
  const debouncedSaveProgress = useCallback(
    debounce(async (chapterId: string, paragraphId: string, scrollOffset: number, scrollOffsetRatio: number) => {
      await onSaveProgress({
        book_id: book.book_id,
        chapter_id: chapterId,
        paragraph_id: paragraphId,
        scroll_offset: scrollOffset,
        scroll_offset_ratio: scrollOffsetRatio,
      })
    }, PROGRESS_SAVE_DEBOUNCE_MS),
    [book.book_id, onSaveProgress]
  )

  // Initialize - scroll to resume position
  useEffect(() => {
    if (isInitialized || !book.chapters.length) return

    const resumeResult = findResumePosition(book, initialProgress)
    if (!resumeResult) {
      setIsInitialized(true)
      return
    }

    setCurrentChapterId(resumeResult.chapter.chapter_id)
    setCurrentParagraphId(resumeResult.paragraph.id)

    // Scroll to paragraph after a brief delay for DOM to render
    setTimeout(() => {
      const paragraphEl = paragraphRefs.current.get(resumeResult.paragraph.id)
      if (paragraphEl) {
        paragraphEl.scrollIntoView({ behavior: 'instant', block: 'start' })

        // Apply scroll offset
        if (containerRef.current && resumeResult.scrollOffset > 0) {
          containerRef.current.scrollTop += resumeResult.scrollOffset
        }

        // Brief highlight if resuming (not first time)
        if (resumeResult.wasExactMatch) {
          setHighlightedParagraphId(resumeResult.paragraph.id)
          setTimeout(() => setHighlightedParagraphId(null), 1500)
        }
      }
      setIsInitialized(true)
    }, 100)
  }, [book, initialProgress, isInitialized])

  // Handle visibility tracking from paragraphs
  const handleParagraphVisible = useCallback((paragraphId: string, ratio: number) => {
    if (!isInitialized || ratio < 0.5) return

    // Find chapter for this paragraph
    for (const chapter of book.chapters) {
      const paragraph = chapter.paragraphs.find(p => p.id === paragraphId)
      if (paragraph) {
        setCurrentChapterId(chapter.chapter_id)
        setCurrentParagraphId(paragraphId)

        // Save progress (debounced)
        const paragraphEl = paragraphRefs.current.get(paragraphId)
        const scrollOffset = paragraphEl?.getBoundingClientRect().top || 0
        debouncedSaveProgress(chapter.chapter_id, paragraphId, Math.round(scrollOffset), ratio)
        break
      }
    }
  }, [book.chapters, isInitialized, debouncedSaveProgress])

  // Save progress on background/tab hide
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && currentChapterId && currentParagraphId) {
        // Save immediately on background
        onSaveProgress({
          book_id: book.book_id,
          chapter_id: currentChapterId,
          paragraph_id: currentParagraphId,
          scroll_offset: 0,
          scroll_offset_ratio: 0,
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [book.book_id, currentChapterId, currentParagraphId, onSaveProgress])

  // Toggle controls on tap
  const handleContainerClick = (e: React.MouseEvent) => {
    // Don't toggle if clicking a control
    if ((e.target as HTMLElement).closest('button')) return
    setShowControls(!showControls)
  }

  // Handle typography changes
  const handleTypographyChange = async (changes: Partial<TypographySettings>) => {
    const newSettings = { ...typography, ...changes }
    setTypography(newSettings)
    await onSaveTypography(changes)
  }

  // Calculate progress
  const progressPct = currentChapterId && currentParagraphId
    ? calculateProgressPercentage(book, currentChapterId, currentParagraphId)
    : 0

  const timeRemaining = currentChapterId && currentParagraphId
    ? calculateTimeRemaining(book, currentChapterId, currentParagraphId, 'reading')
    : book.estimated_read_minutes

  // Listen from current position
  const handleListenFromHere = () => {
    if (!currentParagraphId) return

    // Find the section ID for current paragraph
    for (const chapter of book.chapters) {
      const paragraph = chapter.paragraphs.find(p => p.id === currentParagraphId)
      if (paragraph) {
        onListenFromHere?.(currentParagraphId, paragraph.section_id)
        break
      }
    }
  }

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: colors.bg,
        color: colors.text,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        transition: 'background-color 0.3s, color 0.3s',
      }}
    >
      {/* Header (fades in/out) */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          padding: '1rem',
          background: `linear-gradient(to bottom, ${colors.bg}, transparent)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 50,
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? 'auto' : 'none',
          transition: 'opacity 0.3s',
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'none',
            border: 'none',
            color: colors.text,
            cursor: 'pointer',
            padding: '0.5rem',
            opacity: 0.8,
          }}
        >
          <ArrowLeft size={20} />
          <span style={{ fontSize: '0.875rem' }}>Back</span>
        </button>

        <div style={{
          fontSize: '0.75rem',
          opacity: 0.6,
          textAlign: 'center',
          maxWidth: '50%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {book.title}
        </div>

        <TypographyButton onClick={() => setShowTypography(true)} />
      </header>

      {/* Main Content */}
      <main
        style={{
          maxWidth: 700,
          margin: '0 auto',
          padding: '4rem 1.5rem 8rem',
        }}
      >
        {/* Book Title */}
        <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
          <h1 style={{
            fontSize: `${typography.font_size * 1.75}px`,
            fontFamily: typography.font_family === 'serif'
              ? 'var(--font-serif), Georgia, serif'
              : 'system-ui, sans-serif',
            fontWeight: 600,
            marginBottom: '0.5rem',
          }}>
            {book.title}
          </h1>
          {book.author && (
            <p style={{
              fontSize: `${typography.font_size * 0.875}px`,
              opacity: 0.6,
            }}>
              by {book.author}
            </p>
          )}
        </div>

        {/* Chapters and Paragraphs */}
        {book.chapters.map((chapter, chapterIndex) => (
          <div key={chapter.chapter_id} data-chapter-id={chapter.chapter_id}>
            {chapterIndex > 0 && <ChapterDivider />}
            <ChapterHeader
              title={chapter.title}
              index={chapterIndex}
              typography={typography}
            />
            {chapter.paragraphs.map((paragraph) => (
              <Paragraph
                key={paragraph.id}
                ref={(el) => {
                  if (el) paragraphRefs.current.set(paragraph.id, el)
                }}
                paragraph={paragraph}
                typography={typography}
                isHighlighted={paragraph.id === highlightedParagraphId}
                onVisible={handleParagraphVisible}
              />
            ))}
          </div>
        ))}

        {/* End of book */}
        <div style={{
          textAlign: 'center',
          marginTop: '4rem',
          opacity: 0.5,
          fontSize: '0.875rem',
        }}>
          ~ The End ~
        </div>
      </main>

      {/* Bottom Controls (fades in/out) */}
      <footer
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '1rem',
          background: `linear-gradient(to top, ${colors.bg}, transparent)`,
          zIndex: 50,
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? 'auto' : 'none',
          transition: 'opacity 0.3s',
        }}
      >
        <div style={{
          maxWidth: 700,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}>
          {/* Progress info */}
          <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
            {progressPct}% • {timeRemaining} min left
          </div>

          {/* Listen button */}
          {onListenFromHere && (
            <button
              onClick={handleListenFromHere}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                borderRadius: 24,
                border: 'none',
                background: 'var(--amber-warm)',
                color: '#0F172A',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              <Headphones size={18} />
              Listen from here
            </button>
          )}
        </div>
      </footer>

      {/* Progress bar (always visible) */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: 'rgba(128, 128, 128, 0.2)',
          zIndex: 60,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressPct}%`,
            backgroundColor: 'var(--amber-warm)',
            transition: 'width 0.3s',
          }}
        />
      </div>

      {/* Typography Controls Panel */}
      {showTypography && (
        <TypographyControls
          settings={typography}
          onChange={handleTypographyChange}
          onClose={() => setShowTypography(false)}
        />
      )}
    </div>
  )
}
