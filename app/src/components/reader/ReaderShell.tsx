'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, ChevronDown, Search } from 'lucide-react'
import { TypographyControls, TypographyButton } from './TypographyControls'
import { SearchOverlay } from './SearchOverlay'
import type {
  ReaderBook,
  ReaderProgress,
  AudioProgress,
  TypographySettings,
  ReaderChapter,
  ReaderTheme,
} from '@/lib/reader'
import {
  DEFAULT_TYPOGRAPHY,
  THEME_COLORS,
  MARGIN_VALUES,
  createAnchor,
  resolveAnchor,
} from '@/lib/reader'
import type { TextAnchor } from '@/lib/reader'

interface ReaderShellProps {
  book: ReaderBook
  initialProgress: ReaderProgress | null
  initialAudioProgress?: AudioProgress | null
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
  const [showChapterMenu, setShowChapterMenu] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [highlightText, setHighlightText] = useState<string | null>(null)
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const mainContentRef = useRef<HTMLDivElement>(null)
  const chapterRefs = useRef<Map<number, HTMLElement>>(new Map())

  // Get plain text content for a chapter (for anchor creation)
  const getChapterPlainText = useCallback((chapterIndex: number): string => {
    const chapter = book.chapters[chapterIndex]
    if (!chapter) return ''
    // Strip HTML/markdown from raw content
    return chapter.raw_content
      .replace(/<[^>]+>/g, ' ')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }, [book.chapters])

  // Get combined plain text for all chapters up to current position
  const getFullPlainText = useCallback((): string => {
    return book.chapters.map(ch =>
      ch.raw_content
        .replace(/<[^>]+>/g, ' ')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    ).join(' ')
  }, [book.chapters])

  // Use theme colors from constants
  const colors = THEME_COLORS[typography.theme]
  const marginValue = MARGIN_VALUES[typography.margins]

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
    const mainContent = mainContentRef.current
    if (!container || !initialProgress) return

    // Wait for content to render
    const timeoutId = setTimeout(() => {
      const scrollHeight = container.scrollHeight - container.clientHeight
      if (scrollHeight <= 0) return

      // Try to restore from text-quote anchor first (most reliable)
      if (initialProgress.anchor_exact && mainContent) {
        const anchor: TextAnchor = {
          chapterId: initialProgress.chapter_id,
          charOffsetApprox: initialProgress.anchor_char_offset || 0,
          prefix: initialProgress.anchor_prefix || '',
          exact: initialProgress.anchor_exact,
          suffix: initialProgress.anchor_suffix || '',
        }

        const fullText = getFullPlainText()
        const resolution = resolveAnchor(anchor, fullText)

        if (resolution.confidence !== 'fallback') {
          // Calculate scroll position based on character offset
          // Use a ratio of character offset to total characters
          const totalChars = fullText.length
          const charRatio = resolution.charOffset / totalChars
          const targetScroll = scrollHeight * charRatio
          container.scrollTo({ top: targetScroll, behavior: 'instant' })
          setScrollProgress(Math.round(charRatio * 100))
          return
        }
      }

      // Fallback to scroll_offset_ratio (legacy or if anchor resolution failed)
      const savedRatio = initialProgress.scroll_offset_ratio || (initialProgress.scroll_offset / 100)
      if (savedRatio > 0) {
        const targetScroll = scrollHeight * savedRatio
        container.scrollTo({ top: targetScroll, behavior: 'instant' })
        setScrollProgress(Math.round(savedRatio * 100))
      }
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [initialProgress, getFullPlainText])

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

  // Save progress periodically with text-quote anchor
  useEffect(() => {
    if (scrollProgress === 0 || book.chapters.length === 0) return

    const chapter = book.chapters[currentChapterIndex]
    if (!chapter) return

    const timeoutId = setTimeout(() => {
      // Calculate character offset from scroll position for anchor
      const fullText = getFullPlainText()
      const charOffset = Math.floor((scrollProgress / 100) * fullText.length)

      // Create anchor for reliable resume
      const anchor = createAnchor(chapter.chapter_id, charOffset, fullText)

      onSaveProgress({
        book_id: book.book_id,
        chapter_id: chapter.chapter_id,
        paragraph_id: chapter.paragraphs[0]?.id || '',
        scroll_offset: scrollProgress,
        scroll_offset_ratio: scrollProgress / 100,
        // Include anchor fields
        anchor_prefix: anchor.prefix,
        anchor_exact: anchor.exact,
        anchor_suffix: anchor.suffix,
        anchor_char_offset: anchor.charOffsetApprox,
      })
    }, 3000)

    return () => clearTimeout(timeoutId)
  }, [scrollProgress, currentChapterIndex, book, onSaveProgress, getFullPlainText])

  // Keyboard shortcut for search (Cmd/Ctrl+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        setShowSearch(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Clear highlight after animation
  useEffect(() => {
    if (highlightText) {
      const timeoutId = setTimeout(() => setHighlightText(null), 3000)
      return () => clearTimeout(timeoutId)
    }
  }, [highlightText])

  // Navigate to search result
  const handleSearchNavigate = useCallback((chapterIndex: number, charOffset: number, searchTerm: string) => {
    setShowSearch(false)
    setHighlightText(searchTerm)

    // Calculate scroll position based on character offset in that chapter
    const fullText = getFullPlainText()
    let totalCharsBeforeChapter = 0

    for (let i = 0; i < chapterIndex; i++) {
      const chapterText = getChapterPlainText(i)
      totalCharsBeforeChapter += chapterText.length + 1 // +1 for space separator
    }

    const globalCharOffset = totalCharsBeforeChapter + charOffset
    const charRatio = globalCharOffset / fullText.length

    const container = containerRef.current
    if (container) {
      const scrollHeight = container.scrollHeight - container.clientHeight
      const targetScroll = Math.floor(scrollHeight * charRatio)
      container.scrollTo({ top: targetScroll, behavior: 'smooth' })
    }
  }, [getFullPlainText, getChapterPlainText])

  // Navigate to previous chapter
  const goToPreviousChapter = () => {
    if (currentChapterIndex > 0) {
      scrollToChapter(currentChapterIndex - 1)
    }
  }

  // Navigate to next chapter
  const goToNextChapter = () => {
    if (currentChapterIndex < book.chapters.length - 1) {
      scrollToChapter(currentChapterIndex + 1)
    }
  }

  // Handle tap zones: left (30%) = prev chapter, right (30%) = next chapter, center (40%) = toggle chrome
  const handleContainerClick = (e: React.MouseEvent) => {
    // Ignore if clicking on interactive elements
    if ((e.target as HTMLElement).closest('button')) return
    if ((e.target as HTMLElement).closest('a')) return

    const container = containerRef.current
    if (!container) {
      setShowControls(!showControls)
      return
    }

    const rect = container.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const containerWidth = rect.width

    // Left 30% - previous chapter
    if (clickX < containerWidth * 0.3) {
      goToPreviousChapter()
      return
    }

    // Right 30% - next chapter
    if (clickX > containerWidth * 0.7) {
      goToNextChapter()
      return
    }

    // Center 40% - toggle chrome
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

  // Scroll to chapter
  const scrollToChapter = (chapterIndex: number) => {
    const el = chapterRefs.current.get(chapterIndex)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setShowChapterMenu(false)
    }
  }

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setShowSearch(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 8,
              border: `1px solid ${colors.accent}44`,
              background: 'transparent',
              color: colors.text,
              cursor: 'pointer',
              opacity: 0.8,
            }}
          >
            <Search size={18} />
          </button>
          <TypographyButton onClick={() => setShowTypography(true)} />
        </div>
      </header>

      {/* Main Content - matches old reader styling */}
      <main
        ref={mainContentRef}
        style={{
          maxWidth: 640,
          margin: '0 auto',
          padding: `3rem ${marginValue} 8rem`,
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
                  textAlign: typography.justify ? 'justify' : 'left',
                  hyphens: typography.justify ? 'auto' : 'none',
                  WebkitHyphens: typography.justify ? 'auto' : 'none',
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

          {/* Chapter selector */}
          <button
            onClick={() => setShowChapterMenu(!showChapterMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              borderRadius: 24,
              border: `1px solid ${colors.accent}44`,
              background: 'transparent',
              color: colors.text,
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            Chapter {currentChapterIndex + 1}
            <ChevronDown size={16} />
          </button>
        </div>
      </footer>

      {/* Chapter Menu Overlay */}
      {showChapterMenu && (
        <div
          onClick={() => setShowChapterMenu(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.bg,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              width: '100%',
              maxWidth: 500,
              maxHeight: '70vh',
              overflow: 'auto',
              padding: '1.5rem',
            }}
          >
            <h3 style={{
              fontSize: '1rem',
              fontWeight: 600,
              marginBottom: '1rem',
              color: colors.text,
            }}>
              Chapters
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {book.chapters.map((chapter, idx) => (
                <button
                  key={chapter.chapter_id}
                  onClick={() => scrollToChapter(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.875rem 1rem',
                    borderRadius: 8,
                    border: 'none',
                    background: idx === currentChapterIndex ? `${colors.accent}22` : 'transparent',
                    color: colors.text,
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: colors.accent,
                      opacity: 0.7,
                    }}>
                      {idx + 1}
                    </span>
                    <span style={{
                      fontSize: '0.9375rem',
                      fontWeight: idx === currentChapterIndex ? 600 : 400,
                    }}>
                      {chapter.title}
                    </span>
                  </span>
                  {idx === currentChapterIndex && (
                    <span style={{
                      fontSize: '0.75rem',
                      color: colors.accent,
                      fontWeight: 500,
                    }}>
                      Reading
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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

      {/* Search Overlay */}
      {showSearch && (
        <SearchOverlay
          book={book}
          theme={typography.theme}
          onClose={() => setShowSearch(false)}
          onNavigateToResult={handleSearchNavigate}
        />
      )}
    </div>
  )
}
