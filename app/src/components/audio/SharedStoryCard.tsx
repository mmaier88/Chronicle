'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Clock, Play, Loader2, Headphones, BookOpen } from 'lucide-react'
import { BookCover } from '@/components/cover/BookCover'
import { useAudioStore } from '@/lib/audio/store'

interface SharedStory {
  id: string
  title: string
  created_at: string
  core_question: string | null
  cover_url: string | null
  share_token: string
}

interface SharedStoryCardProps {
  story: SharedStory
}

export function SharedStoryCard({ story }: SharedStoryCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { loadBook, play, bookId, isVisible } = useAudioStore()

  const isCurrentlyPlaying = isVisible && bookId === story.id

  const handleListenClick = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    if (isCurrentlyPlaying) {
      useAudioStore.getState().setExpanded(true)
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch(`/api/share/${story.share_token}`)
      if (!res.ok) {
        throw new Error('Failed to fetch book')
      }

      const { book, sections } = await res.json()

      if (!sections || sections.length === 0) {
        alert('This story has no audio content yet.')
        setIsLoading(false)
        return
      }

      loadBook(
        book.id,
        book.title,
        book.cover_url,
        sections,
        (sectionId: string) => `/api/tts/shared/${story.share_token}/section/${sectionId}`
      )

      await play()
    } catch (err) {
      console.error('[SharedStoryCard] Failed to load audio:', err)
      alert('Failed to load audio. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, a')) {
      return
    }
    handleListenClick()
  }

  return (
    <div
      className="app-card"
      onClick={handleCardClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flex: 1,
        }}
      >
        <BookCover
          coverUrl={story.cover_url}
          title={story.title}
          status="ready"
          size="sm"
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 className="app-heading-3" style={{ marginBottom: '0.25rem' }}>
            {story.title}
          </h3>
          {story.core_question && (
            <p
              className="app-body-sm"
              style={{
                marginBottom: '0.5rem',
                opacity: 0.8,
                fontStyle: 'italic',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {story.core_question}
            </p>
          )}
          <p
            className="app-body-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: 0.6,
            }}
          >
            <Clock style={{ width: 12, height: 12 }} />
            {new Date(story.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginLeft: '1rem' }}>
        {/* Listen button */}
        <button
          onClick={handleListenClick}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.5rem 0.75rem',
            borderRadius: 8,
            background: isCurrentlyPlaying
              ? 'var(--amber-warm)'
              : 'rgba(212, 165, 116, 0.1)',
            color: isCurrentlyPlaying ? 'var(--night-deep)' : 'var(--amber-warm)',
            fontSize: '0.8125rem',
            fontWeight: 500,
            border: 'none',
            cursor: isLoading ? 'wait' : 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s',
          }}
          className="story-card-btn"
        >
          {isLoading ? (
            <Loader2
              style={{
                width: 14,
                height: 14,
                animation: 'spin 1s linear infinite',
              }}
            />
          ) : isCurrentlyPlaying ? (
            <Headphones style={{ width: 14, height: 14 }} />
          ) : (
            <Play style={{ width: 14, height: 14 }} />
          )}
          {isCurrentlyPlaying ? 'Playing' : 'Listen'}
        </button>

        {/* Read button */}
        <Link
          href={`/share/${story.share_token}`}
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.5rem 0.75rem',
            borderRadius: 8,
            background: 'rgba(212, 165, 116, 0.1)',
            color: 'var(--amber-warm)',
            fontSize: '0.8125rem',
            fontWeight: 500,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s',
          }}
          className="story-card-btn"
        >
          <BookOpen style={{ width: 14, height: 14 }} />
          Read
        </Link>
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
      <style jsx global>{`
        .story-card-btn:hover:not(:disabled) {
          background: var(--amber-warm) !important;
          color: var(--night-deep) !important;
        }
      `}</style>
    </div>
  )
}
