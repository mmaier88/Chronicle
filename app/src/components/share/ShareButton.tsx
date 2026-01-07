'use client'

import { useState } from 'react'
import { Share2, Link2, Check, Loader2 } from 'lucide-react'

interface ShareButtonProps {
  bookId: string
  existingShareUrl?: string | null
}

export function ShareButton({ bookId, existingShareUrl }: ShareButtonProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(existingShareUrl || null)
  const [isCreating, setIsCreating] = useState(false)
  const [copied, setCopied] = useState(false)

  const createShare = async () => {
    setIsCreating(true)
    try {
      const response = await fetch('/api/share/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId }),
      })
      const data = await response.json()
      if (data.shareUrl) {
        setShareUrl(data.shareUrl)
      }
    } catch (err) {
      console.error('Failed to create share link:', err)
    } finally {
      setIsCreating(false)
    }
  }

  const copyToClipboard = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!shareUrl) {
    return (
      <button
        onClick={createShare}
        disabled={isCreating}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          background: 'rgba(250, 246, 237, 0.05)',
          border: '1px solid rgba(250, 246, 237, 0.15)',
          borderRadius: 8,
          color: 'var(--moon-soft)',
          fontSize: '0.875rem',
          cursor: isCreating ? 'wait' : 'pointer',
          transition: 'all 0.2s',
          opacity: isCreating ? 0.7 : 1,
        }}
      >
        {isCreating ? (
          <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
        ) : (
          <Share2 style={{ width: 16, height: 16 }} />
        )}
        Share
        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </button>
    )
  }

  return (
    <button
      onClick={copyToClipboard}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        background: copied ? 'rgba(76, 175, 80, 0.15)' : 'rgba(250, 246, 237, 0.05)',
        border: `1px solid ${copied ? 'rgba(76, 175, 80, 0.3)' : 'rgba(250, 246, 237, 0.15)'}`,
        borderRadius: 8,
        color: copied ? '#4CAF50' : 'var(--moon-soft)',
        fontSize: '0.875rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {copied ? (
        <Check style={{ width: 16, height: 16 }} />
      ) : (
        <Link2 style={{ width: 16, height: 16 }} />
      )}
      {copied ? 'Copied!' : 'Copy Link'}
    </button>
  )
}
