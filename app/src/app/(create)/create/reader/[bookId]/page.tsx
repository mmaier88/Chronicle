'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { ReaderShell } from '@/components/reader'
import type {
  ReaderBook,
  ReaderProgress,
  TypographySettings,
} from '@/lib/reader'

interface PageProps {
  params: Promise<{ bookId: string }>
}

/**
 * Chronicle Reader Page
 *
 * Immersive reading experience with:
 * - Paragraph-based rendering
 * - Perfect resume
 * - Typography controls
 * - Audio integration
 */
export default function ReaderPage({ params }: PageProps) {
  const { bookId } = use(params)
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [book, setBook] = useState<ReaderBook | null>(null)
  const [progress, setProgress] = useState<ReaderProgress | null>(null)
  const [typography, setTypography] = useState<TypographySettings | null>(null)

  // Load book data
  useEffect(() => {
    async function loadData() {
      try {
        // Load book content
        const bookRes = await fetch(`/api/reader/book/${bookId}`)
        const bookData = await bookRes.json()

        if (!bookRes.ok) {
          setError(bookData.error?.message || 'Failed to load book')
          setIsLoading(false)
          return
        }

        setBook(bookData.data.book)
        setProgress(bookData.data.progress)

        // Load typography settings
        const typoRes = await fetch('/api/reader/typography')
        const typoData = await typoRes.json()

        if (typoRes.ok) {
          setTypography(typoData.data.settings)
        }

        setIsLoading(false)
      } catch (err) {
        setError('Failed to load book')
        setIsLoading(false)
      }
    }

    loadData()
  }, [bookId])

  // Save reading progress
  const handleSaveProgress = async (newProgress: Omit<ReaderProgress, 'user_id' | 'updated_at'>) => {
    try {
      await fetch('/api/reader/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: newProgress.book_id,
          chapterId: newProgress.chapter_id,
          paragraphId: newProgress.paragraph_id,
          scrollOffset: newProgress.scroll_offset,
          scrollOffsetRatio: newProgress.scroll_offset_ratio,
          // Text-quote anchor fields for reliable resume
          anchorPrefix: newProgress.anchor_prefix,
          anchorExact: newProgress.anchor_exact,
          anchorSuffix: newProgress.anchor_suffix,
          anchorCharOffset: newProgress.anchor_char_offset,
        }),
      })
    } catch (err) {
      console.error('Failed to save progress:', err)
    }
  }

  // Save typography settings
  const handleSaveTypography = async (settings: Partial<TypographySettings>) => {
    try {
      await fetch('/api/reader/typography', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fontSize: settings.font_size,
          lineHeight: settings.line_height,
          fontFamily: settings.font_family,
          theme: settings.theme,
          margins: settings.margins,
          justify: settings.justify,
        }),
      })
    } catch (err) {
      console.error('Failed to save typography:', err)
    }
  }

  // Back to story list
  const handleBack = () => {
    router.push('/create/stories')
  }

  // Loading state
  if (isLoading) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0F172A',
      }}>
        <Loader2 style={{
          width: 32,
          height: 32,
          animation: 'spin 1s linear infinite',
          color: 'var(--amber-warm)',
        }} />
        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  // Error state
  if (error || !book) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0F172A',
        color: '#FAF6ED',
        padding: '2rem',
        textAlign: 'center',
      }}>
        <p style={{ marginBottom: '1rem', opacity: 0.7 }}>
          {error || 'Book not found'}
        </p>
        <button
          onClick={handleBack}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: 8,
            border: '1px solid rgba(250, 246, 237, 0.2)',
            background: 'transparent',
            color: '#FAF6ED',
            cursor: 'pointer',
          }}
        >
          Back to stories
        </button>
      </div>
    )
  }

  // Empty book
  if (book.chapters.length === 0 || book.total_paragraphs === 0) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0F172A',
        color: '#FAF6ED',
        padding: '2rem',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontSize: '1.5rem',
          marginBottom: '0.5rem',
          fontFamily: 'var(--font-serif)',
        }}>
          {book.title}
        </h1>
        <p style={{ opacity: 0.6, marginBottom: '1.5rem' }}>
          This book is still being written...
        </p>
        <button
          onClick={handleBack}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: 8,
            border: '1px solid rgba(250, 246, 237, 0.2)',
            background: 'transparent',
            color: '#FAF6ED',
            cursor: 'pointer',
          }}
        >
          Back to stories
        </button>
      </div>
    )
  }

  return (
    <ReaderShell
      book={book}
      initialProgress={progress}
      initialTypography={typography}
      onSaveProgress={handleSaveProgress}
      onSaveTypography={handleSaveTypography}
      onBack={handleBack}
    />
  )
}
