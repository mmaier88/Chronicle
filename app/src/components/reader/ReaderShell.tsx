'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Headphones } from 'lucide-react'
import { TypographyControls, TypographyButton } from './TypographyControls'
import type {
  ReaderBook,
  ReaderProgress,
  AudioProgress,
  TypographySettings,
  ReaderChapter,
  ReaderTheme,
} from '@/lib/reader'
import { DEFAULT_TYPOGRAPHY } from '@/lib/reader'

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
 * Simplified V1 - renders content like the old reader for visual parity.
 * Tracks progress at chapter level.
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
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const chapterRefs = useRef<Map<number, HTMLElement>>(new Map())

  // Theme colors - matches Chronicle design system
  const themeColors: Record<ReaderTheme, { bg: string; text: string; accent: string }> = {
    light: { bg: '#FAF6ED', text: '#1A1A1A', accent: '#8B7355' },
    dark: { bg: '#0F172A', text: '#B8C4D9', accent: '#D4A574' },
    'warm-night': { bg: '#1C1410', text: '#E8D5C4', accent: '#D4A574' },
  }

  const colors = themeColors[typography.theme]

  // Convert markdown to HTML (like old reader)
  const markdownToHtml = (text: string): string => {
    if (!text) return ''
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
    html = html.replace(/\n/g, '<br />')
    return html
  }

  // Restore scroll position on load
  useEffect(() => {
    const container = containerRef.current
    if (!container || !initialProgress) return

    // Wait for content to render
    const timeoutId = setTimeout(() => {
      const scrollHeight = container.scrollHeight - container.clientHeight
      const savedRatio = initialProgress.scroll_offset_ratio || (initialProgress.scroll_offset / 100)
      if (scrollHeight > 0 && savedRatio > 0) {
        const targetScroll = scrollHeight * savedRatio
        container.scrollTo({ top: targetScroll, behavior: 'instant' })
        setScrollProgress(Math.round(savedRatio * 100))
      }
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [initialProgress])

  // Track scroll position for progress
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const scrollTop = container.scrollTop
      const scrollHeight = container.scrollHeight - container.clientHeight
      const progress = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0
      setScrollProgress(progress)

      // Find current chapter based on scroll position
      let currentIdx = 0
      chapterRefs.current.forEach((el, idx) => {
        const rect = el.getBoundingClientRect()
        if (rect.top < window.innerHeight / 2) {
          currentIdx = idx
        }
      })
      setCurrentChapterIndex(currentIdx)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // Save progress periodically
  useEffect(() => {
    if (scrollProgress === 0 || book.chapters.length === 0) return

    const chapter = book.chapters[currentChapterIndex]
    if (!chapter) return

    const timeoutId = setTimeout(() => {
      onSaveProgress({
        book_id: book.book_id,
        chapter_id: chapter.chapter_id,
        paragraph_id: chapter.paragraphs[0]?.id || '',
        scroll_offset: scrollProgress,
        scroll_offset_ratio: scrollProgress / 100,
      })
    }, 3000)

    return () => clearTimeout(timeoutId)
  }, [scrollProgress, currentChapterIndex, book, onSaveProgress])

  // Toggle controls on tap
  const handleContainerClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    if ((e.target as HTMLElement).closest('a')) return
    setShowControls(!showControls)
  }

  // Handle typography changes
  const handleTypographyChange = async (changes: Partial<TypographySettings>) => {
    const newSettings = { ...typography, ...changes }
    setTypography(newSettings)
    await onSaveTypography(changes)
  }

  // Calculate time remaining
  const timeRemaining = Math.ceil(book.estimated_read_minutes * (1 - scrollProgress / 100))

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
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

      {/* Main Content - matches old reader styling */}
      <main
        style={{
          maxWidth: 640,
          margin: '0 auto',
          padding: '3rem 1.5rem 8rem',
        }}
      >
        {/* Book Title */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontWeight: 600,
            marginBottom: '0.5rem',
            color: colors.text,
          }}>
            {book.title}
          </h1>
          {book.author && (
            <p style={{
              fontSize: '1rem',
              opacity: 0.6,
              marginTop: '0.5rem',
            }}>
              by {book.author}
            </p>
          )}
        </div>

        {/* Chapters - styled like old reader */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
          {book.chapters.map((chapter, chIdx) => (
            <article
              key={chapter.chapter_id}
              ref={(el) => { if (el) chapterRefs.current.set(chIdx, el) }}
              style={{ scrollMarginTop: 32 }}
            >
              {/* Chapter Header */}
              <div style={{ textAlign: 'center', marginBottom: '2.5rem', padding: '1.5rem 0' }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: colors.accent,
                }}>
                  Chapter {chIdx + 1}
                </span>
                <h2 style={{
                  marginTop: '0.5rem',
                  fontSize: '1.5rem',
                  fontFamily: 'var(--font-serif), Georgia, serif',
                  fontWeight: 600,
                }}>
                  {chapter.title}
                </h2>
              </div>

              {/* Chapter Content - render like old reader */}
              <div
                style={{
                  color: colors.text,
                  lineHeight: typography.line_height,
                  fontSize: `${typography.font_size}px`,
                  fontFamily: typography.font_family === 'serif'
                    ? 'var(--font-serif), Georgia, serif'
                    : '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                }}
                dangerouslySetInnerHTML={{ __html: markdownToHtml(chapter.raw_content) }}
              />

              {/* Chapter divider */}
              {chIdx < book.chapters.length - 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginTop: '3rem',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: colors.accent,
                    opacity: 0.3,
                  }}>
                    <span style={{ width: 32, height: 1, background: colors.accent }} />
                    <span style={{ fontSize: '1.125rem' }}>✦</span>
                    <span style={{ width: 32, height: 1, background: colors.accent }} />
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>

        {/* End */}
        <footer style={{
          textAlign: 'center',
          padding: '5rem 0',
          marginTop: '4rem',
          borderTop: `1px solid ${colors.accent}22`,
        }}>
          <p style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: '1.5rem',
            color: colors.accent,
            fontStyle: 'italic',
            opacity: 0.6,
          }}>
            — The End —
          </p>
        </footer>
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
          maxWidth: 640,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}>
          {/* Progress info */}
          <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
            {scrollProgress}% • {timeRemaining} min left
          </div>

          {/* Listen button */}
          {onListenFromHere && book.chapters[currentChapterIndex]?.paragraphs[0] && (
            <button
              onClick={() => {
                const chapter = book.chapters[currentChapterIndex]
                const paragraph = chapter.paragraphs[0]
                onListenFromHere(paragraph.id, paragraph.section_id)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                borderRadius: 24,
                border: 'none',
                background: colors.accent,
                color: colors.bg,
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

      {/* Progress info (always visible) */}
      <div
        style={{
          position: 'fixed',
          bottom: 12,
          left: 16,
          fontSize: '0.75rem',
          color: colors.text,
          opacity: 0.5,
          zIndex: 60,
        }}
      >
        {scrollProgress}% • {timeRemaining} min left
      </div>

      {/* Progress bar (always visible) */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: `${colors.accent}33`,
          zIndex: 60,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${scrollProgress}%`,
            backgroundColor: colors.accent,
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
