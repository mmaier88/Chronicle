'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Loader2 } from 'lucide-react'

interface RegenerateCoverButtonProps {
  bookId: string
  onRegenerated?: () => void
}

export function RegenerateCoverButton({ bookId, onRegenerated }: RegenerateCoverButtonProps) {
  const [isRegenerating, setIsRegenerating] = useState(false)
  const router = useRouter()

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    try {
      const response = await fetch('/api/cover/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, regenerate: true }),
      })

      if (response.ok) {
        onRegenerated?.()
        // Refresh the page to show the new cover
        router.refresh()
      } else {
        const data = await response.json()
        console.error('Failed to regenerate cover:', data.error || data)
      }
    } catch (err) {
      console.error('Failed to regenerate cover:', err)
    } finally {
      setIsRegenerating(false)
    }
  }

  return (
    <button
      onClick={handleRegenerate}
      disabled={isRegenerating}
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
        cursor: isRegenerating ? 'wait' : 'pointer',
        transition: 'all 0.2s',
        opacity: isRegenerating ? 0.7 : 1,
      }}
    >
      {isRegenerating ? (
        <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
      ) : (
        <RefreshCw style={{ width: 16, height: 16 }} />
      )}
      {isRegenerating ? 'Generating...' : 'New Cover'}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  )
}
