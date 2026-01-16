'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface AutoResumeRedirectProps {
  jobId: string | null
  bookTitle?: string | null
  isRemix?: boolean
}

/**
 * Auto-redirects to the generating page if there's an in-progress job.
 * The generating page handles all recovery automatically.
 */
export function AutoResumeRedirect({ jobId, bookTitle, isRemix }: AutoResumeRedirectProps) {
  const router = useRouter()

  useEffect(() => {
    if (jobId) {
      // Small delay to let the page render briefly so user sees something
      const timer = setTimeout(() => {
        router.push(`/create/generating/${jobId}`)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [jobId, router])

  if (!jobId) return null

  const message = bookTitle
    ? isRemix
      ? `Resuming remix of "${bookTitle}"...`
      : `Resuming "${bookTitle}"...`
    : 'Resuming your story...'

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(10, 18, 36, 0.95)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: '0 1rem' }}>
        <div style={{
          width: 48,
          height: 48,
          margin: '0 auto 1rem',
          border: '3px solid rgba(212, 165, 116, 0.2)',
          borderTopColor: 'var(--amber-warm)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p className="app-body" style={{ color: 'var(--amber-warm)' }}>
          {message}
        </p>
        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}
