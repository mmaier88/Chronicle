'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BookOpen, Clock, Play, Loader2 } from 'lucide-react'
import { BookCover } from '@/components/cover/BookCover'
import { CoverStatus } from '@/types/chronicle'
import { useAudioStore } from '@/lib/audio/store'

interface Story {
  id: string
  title: string
  status: string
  created_at: string
  core_question: string | null
  cover_url: string | null
  cover_status: CoverStatus
}

interface AudioStoryCardProps {
  story: Story
}

export function AudioStoryCard({ story }: AudioStoryCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { loadBook, play, bookId, isVisible } = useAudioStore()

  const isCurrentlyPlaying = isVisible && bookId === story.id

  const handlePlayClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isCurrentlyPlaying) {
      // Already playing this book, just expand
      useAudioStore.getState().setExpanded(true)
      return
    }

    setIsLoading(true)

    try {
      // Fetch book sections
      const res = await fetch(`/api/audio/book/${story.id}`)
      if (!res.ok) throw new Error('Failed to fetch book')

      const { book, sections, savedProgress } = await res.json()

      if (sections.length === 0) {
        alert('This story has no audio content yet.')
        setIsLoading(false)
        return
      }

      // Load into audio store
      loadBook(
        book.id,
        book.title,
        book.coverUrl,
        sections,
        (sectionId: string) => `/api/tts/section/${sectionId}`,
        savedProgress
      )

      // Auto-play
      await play()
    } catch (err) {
      console.error('Failed to load audio:', err)
      alert('Failed to load audio. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="app-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* Main clickable area - opens player */}
      <div
        onClick={handlePlayClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flex: 1,
          cursor: 'pointer',
        }}
      >
        {/* Cover with play overlay */}
        <div style={{ position: 'relative' }}>
          <BookCover
            coverUrl={story.cover_url}
            title={story.title}
            status={story.cover_status}
            size="sm"
          />
          {/* Play overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isCurrentlyPlaying
                ? 'rgba(212, 165, 116, 0.3)'
                : 'rgba(0, 0, 0, 0.4)',
              borderRadius: 12,
              opacity: isLoading || isCurrentlyPlaying ? 1 : 0,
              transition: 'opacity 0.2s',
            }}
            className="play-overlay"
          >
            {isLoading ? (
              <Loader2
                style={{
                  width: 24,
                  height: 24,
                  color: 'white',
                  animation: 'spin 1s linear infinite',
                }}
              />
            ) : (
              <Play
                style={{
                  width: 24,
                  height: 24,
                  color: 'white',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                }}
              />
            )}
          </div>
        </div>

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

      {/* Secondary actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginLeft: '1rem',
        }}
      >
        <Link
          href={`/reader/${story.id}`}
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
          }}
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
        .app-card:hover .play-overlay {
          opacity: 1;
        }
      `}</style>
    </div>
  )
}
