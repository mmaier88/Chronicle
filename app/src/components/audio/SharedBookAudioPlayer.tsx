'use client'

import { useState } from 'react'
import { Headphones, Loader2 } from 'lucide-react'
import { useAudioStore } from '@/lib/audio/store'

interface Section {
  id: string
  title: string
  chapterTitle: string
  chapterIndex: number
  sectionIndex: number
}

interface SharedBookAudioPlayerProps {
  bookTitle: string
  sections: Section[]
  shareToken: string
  bookId?: string
  coverUrl?: string | null
}

export function SharedBookAudioPlayer({ bookTitle, sections, shareToken, bookId, coverUrl }: SharedBookAudioPlayerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { loadBook, play, bookId: currentBookId, isVisible } = useAudioStore()

  const isCurrentBook = isVisible && currentBookId === bookId

  const handleClick = async () => {
    if (isCurrentBook) {
      // Already playing this book, just expand the player
      useAudioStore.getState().setExpanded(true)
      return
    }

    setIsLoading(true)

    try {
      // Load into audio store
      loadBook(
        bookId || `shared-${shareToken}`,
        bookTitle,
        coverUrl || null,
        sections,
        (sectionId: string) => `/api/tts/shared/${shareToken}/section/${sectionId}`
      )

      // Auto-play
      await play()
    } catch (err) {
      console.error('[SharedBookAudioPlayer] Failed to start audio:', err)
      alert('Failed to start audio. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1.25rem',
        background: isCurrentBook
          ? 'linear-gradient(135deg, rgba(212, 165, 116, 0.3), rgba(212, 165, 116, 0.15))'
          : 'linear-gradient(135deg, rgba(212, 165, 116, 0.2), rgba(212, 165, 116, 0.1))',
        border: '1px solid rgba(212, 165, 116, 0.4)',
        borderRadius: 50,
        color: 'var(--amber-warm)',
        fontSize: '0.875rem',
        fontWeight: 500,
        cursor: isLoading ? 'wait' : 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {isLoading ? (
        <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
      ) : (
        <Headphones style={{ width: 18, height: 18 }} />
      )}
      {isCurrentBook ? 'Now Playing' : 'Listen'}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  )
}
