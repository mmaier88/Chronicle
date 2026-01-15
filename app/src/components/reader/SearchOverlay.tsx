'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Search, ChevronUp, ChevronDown } from 'lucide-react'
import type { ReaderBook, ReaderChapter, ReaderTheme } from '@/lib/reader'
import { THEME_COLORS } from '@/lib/reader'

interface SearchResult {
  chapterIndex: number
  chapterTitle: string
  text: string
  charOffset: number
  contextBefore: string
  contextAfter: string
}

interface SearchOverlayProps {
  book: ReaderBook
  theme: ReaderTheme
  onClose: () => void
  onNavigateToResult: (chapterIndex: number, charOffset: number, searchTerm: string) => void
}

const CONTEXT_LENGTH = 30

/**
 * Search Overlay Component
 *
 * Full-screen search with:
 * - Debounced search across all chapters
 * - Results with context
 * - Navigate to result on tap
 */
export function SearchOverlay({
  book,
  theme,
  onClose,
  onNavigateToResult,
}: SearchOverlayProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const colors = THEME_COLORS[theme]

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter' && results.length > 0) {
        const result = results[selectedIndex]
        if (result) {
          onNavigateToResult(result.chapterIndex, result.charOffset, query)
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, results, selectedIndex, query, onNavigateToResult])

  // Get plain text from chapter
  const getChapterText = useCallback((chapter: ReaderChapter): string => {
    return chapter.raw_content
      .replace(/<[^>]+>/g, ' ')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }, [])

  // Search with debounce
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }

    setIsSearching(true)
    const timeoutId = setTimeout(() => {
      const searchResults: SearchResult[] = []
      const searchLower = query.toLowerCase()

      book.chapters.forEach((chapter, chapterIndex) => {
        const text = getChapterText(chapter)
        const textLower = text.toLowerCase()

        let searchPos = 0
        while (searchPos < textLower.length) {
          const matchIndex = textLower.indexOf(searchLower, searchPos)
          if (matchIndex === -1) break

          // Extract context
          const contextStart = Math.max(0, matchIndex - CONTEXT_LENGTH)
          const contextEnd = Math.min(text.length, matchIndex + query.length + CONTEXT_LENGTH)
          const contextBefore = text.slice(contextStart, matchIndex)
          const matchText = text.slice(matchIndex, matchIndex + query.length)
          const contextAfter = text.slice(matchIndex + query.length, contextEnd)

          searchResults.push({
            chapterIndex,
            chapterTitle: chapter.title,
            text: matchText,
            charOffset: matchIndex,
            contextBefore: (contextStart > 0 ? '...' : '') + contextBefore,
            contextAfter: contextAfter + (contextEnd < text.length ? '...' : ''),
          })

          searchPos = matchIndex + 1

          // Limit results per chapter to prevent overwhelming results
          if (searchResults.filter(r => r.chapterIndex === chapterIndex).length >= 10) {
            break
          }
        }
      })

      setResults(searchResults.slice(0, 50)) // Limit total results
      setSelectedIndex(0)
      setIsSearching(false)
    }, 200)

    return () => clearTimeout(timeoutId)
  }, [query, book.chapters, getChapterText])

  // Navigate to next/previous result
  const goToNextResult = () => {
    if (results.length > 0) {
      setSelectedIndex(prev => (prev + 1) % results.length)
    }
  }

  const goToPrevResult = () => {
    if (results.length > 0) {
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length)
    }
  }

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    onNavigateToResult(result.chapterIndex, result.charOffset, query)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: colors.bg,
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Search Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          borderBottom: `1px solid ${colors.accent}33`,
        }}
      >
        <Search size={20} style={{ color: colors.muted, flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search in book..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: colors.text,
            fontSize: '1rem',
          }}
        />
        {results.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: colors.muted,
            fontSize: '0.875rem',
          }}>
            <span>{selectedIndex + 1}/{results.length}</span>
            <button
              onClick={goToPrevResult}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem',
                color: colors.muted,
              }}
            >
              <ChevronUp size={18} />
            </button>
            <button
              onClick={goToNextResult}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem',
                color: colors.muted,
              }}
            >
              <ChevronDown size={18} />
            </button>
          </div>
        )}
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.5rem',
            color: colors.text,
            opacity: 0.6,
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Results List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.5rem',
        }}
      >
        {query.length < 2 && (
          <p style={{
            textAlign: 'center',
            color: colors.muted,
            padding: '2rem 1rem',
            fontSize: '0.875rem',
          }}>
            Type at least 2 characters to search
          </p>
        )}

        {query.length >= 2 && isSearching && (
          <p style={{
            textAlign: 'center',
            color: colors.muted,
            padding: '2rem 1rem',
            fontSize: '0.875rem',
          }}>
            Searching...
          </p>
        )}

        {query.length >= 2 && !isSearching && results.length === 0 && (
          <p style={{
            textAlign: 'center',
            color: colors.muted,
            padding: '2rem 1rem',
            fontSize: '0.875rem',
          }}>
            No results found for "{query}"
          </p>
        )}

        {results.map((result, idx) => (
          <button
            key={`${result.chapterIndex}-${result.charOffset}`}
            onClick={() => handleResultClick(result)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '0.875rem 1rem',
              borderRadius: 8,
              border: 'none',
              background: idx === selectedIndex ? `${colors.accent}22` : 'transparent',
              cursor: 'pointer',
              marginBottom: '0.25rem',
            }}
          >
            <div style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: colors.accent,
              marginBottom: '0.375rem',
            }}>
              Chapter {result.chapterIndex + 1}: {result.chapterTitle}
            </div>
            <div style={{
              fontSize: '0.875rem',
              color: colors.text,
              lineHeight: 1.5,
            }}>
              <span style={{ opacity: 0.6 }}>{result.contextBefore}</span>
              <span style={{
                backgroundColor: `${colors.accent}44`,
                borderRadius: 2,
                padding: '0 2px',
              }}>
                {result.text}
              </span>
              <span style={{ opacity: 0.6 }}>{result.contextAfter}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Keyboard hints */}
      <div
        style={{
          padding: '0.75rem 1rem',
          borderTop: `1px solid ${colors.accent}33`,
          display: 'flex',
          justifyContent: 'center',
          gap: '1.5rem',
          fontSize: '0.75rem',
          color: colors.muted,
        }}
      >
        <span>Enter to go • Arrows to navigate • Esc to close</span>
      </div>
    </div>
  )
}
