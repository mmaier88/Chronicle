'use client'

import { BookOpen, Loader2 } from 'lucide-react'

interface BookCoverProps {
  coverUrl?: string | null
  title: string
  status?: 'pending' | 'generating' | 'ready' | 'failed' | null
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: { width: 80, height: 120 },
  md: { width: 160, height: 240 },
  lg: { width: 200, height: 300 },
}

export function BookCover({ coverUrl, title, status, size = 'md' }: BookCoverProps) {
  const { width, height } = sizes[size]

  // Generating state
  if (status === 'generating') {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(212, 165, 116, 0.1)',
          border: '1px solid rgba(212, 165, 116, 0.2)',
          borderRadius: 8,
        }}
      >
        <div style={{ textAlign: 'center', color: 'var(--amber-warm)' }}>
          <Loader2
            style={{
              width: size === 'sm' ? 20 : 32,
              height: size === 'sm' ? 20 : 32,
              animation: 'spin 1s linear infinite',
              marginBottom: 8,
            }}
          />
          {size !== 'sm' && (
            <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>Generating cover...</p>
          )}
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
      </div>
    )
  }

  // Ready with cover URL
  if (coverUrl && (status === 'ready' || !status)) {
    return (
      <img
        src={coverUrl}
        alt={`Cover for ${title}`}
        style={{
          width,
          height,
          objectFit: 'cover',
          borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
        }}
      />
    )
  }

  // Placeholder (pending, failed, or no cover)
  return (
    <div
      style={{
        width,
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 8,
        background: 'linear-gradient(135deg, rgba(20, 30, 48, 0.8), rgba(30, 40, 60, 0.8))',
        border: '1px solid rgba(250, 246, 237, 0.1)',
        borderRadius: 8,
        color: 'var(--moon-soft)',
      }}
    >
      <BookOpen
        style={{
          width: size === 'sm' ? 24 : size === 'md' ? 40 : 48,
          height: size === 'sm' ? 24 : size === 'md' ? 40 : 48,
          opacity: 0.4,
        }}
      />
      {size !== 'sm' && (
        <p
          style={{
            fontSize: size === 'md' ? '0.75rem' : '0.875rem',
            opacity: 0.5,
            textAlign: 'center',
            padding: '0 1rem',
            lineHeight: 1.4,
          }}
        >
          {title.length > 30 ? title.slice(0, 30) + '...' : title}
        </p>
      )}
    </div>
  )
}
