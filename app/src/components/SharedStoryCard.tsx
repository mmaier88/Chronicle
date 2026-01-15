'use client'

import Link from 'next/link'
import { Clock, BookOpen } from 'lucide-react'
import { BookCover } from '@/components/cover/BookCover'

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
  return (
    <Link
      href={`/share/${story.share_token}`}
      className="app-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        textDecoration: 'none',
        color: 'inherit',
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

      <div
        className="story-card-btn"
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
          whiteSpace: 'nowrap',
          transition: 'all 0.2s',
          marginLeft: '1rem',
        }}
      >
        <BookOpen style={{ width: 14, height: 14 }} />
        Read
      </div>

      <style jsx global>{`
        .story-card-btn:hover {
          background: var(--amber-warm) !important;
          color: var(--night-deep) !important;
        }
      `}</style>
    </Link>
  )
}
