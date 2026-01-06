'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loader2, CheckCircle, XCircle, BookOpen, RefreshCw, Feather } from 'lucide-react'

interface JobStatus {
  id: string
  book_id: string | null
  status: 'queued' | 'running' | 'failed' | 'complete'
  step: string | null
  progress: number
  error: string | null
}

const STEP_LABELS: Record<string, string> = {
  created: 'Setting the stage...',
  constitution: 'Finding the voice...',
  plan: 'Mapping the arc...',
  finalize: 'Adding final touches...',
  complete: 'Your story awaits!',
}

function getStepLabel(step: string | null | undefined): string {
  if (!step) return 'Gathering inspiration...'
  if (STEP_LABELS[step]) return STEP_LABELS[step]

  // Parse write_chX_sY
  const writeMatch = step.match(/^write_ch(\d+)_s(\d+)$/)
  if (writeMatch) {
    const ch = parseInt(writeMatch[1]) + 1
    const s = parseInt(writeMatch[2]) + 1
    return `Writing Chapter ${ch}, Scene ${s}...`
  }

  return step
}

export default function VibeGeneratingPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.jobId as string

  const [status, setStatus] = useState<JobStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tickCount, setTickCount] = useState(0)

  // Fetch status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/create/job/${jobId}/status`)
      if (!response.ok) {
        setError('Failed to fetch status')
        return
      }
      const data = await response.json()
      setStatus(data)
      return data
    } catch {
      setError('Connection error')
      return null
    }
  }, [jobId])

  // Tick the job forward
  const tickJob = useCallback(async () => {
    try {
      const response = await fetch(`/api/create/job/${jobId}/tick`, {
        method: 'POST',
      })
      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Tick failed')
        return
      }
      const data = await response.json()
      setStatus(prev => prev ? { ...prev, ...data } : null)
      setTickCount(c => c + 1)
    } catch {
      setError('Connection error')
    }
  }, [jobId])

  // Initial fetch
  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Auto-tick while running
  useEffect(() => {
    if (!status) return
    if (status.status === 'complete' || status.status === 'failed') return

    // Small delay between ticks to avoid hammering
    const timer = setTimeout(() => {
      tickJob()
    }, 1000)

    return () => clearTimeout(timer)
  }, [status, tickJob, tickCount])

  // Redirect when complete
  useEffect(() => {
    if (status?.status === 'complete' && status.book_id) {
      setTimeout(() => {
        router.push(`/create/read/${status.book_id}`)
      }, 2000)
    }
  }, [status, router])

  const handleRetry = async () => {
    setError(null)
    await tickJob()
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', paddingTop: '3rem' }}>
      {/* Icon */}
      <div style={{ marginBottom: '2.5rem' }}>
        {status?.status === 'complete' ? (
          <div style={{
            width: 96,
            height: 96,
            margin: '0 auto',
            background: 'linear-gradient(135deg, rgba(212, 165, 116, 0.2), rgba(212, 165, 116, 0.1))',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(212, 165, 116, 0.2)'
          }}>
            <CheckCircle style={{ width: 48, height: 48, color: 'var(--amber-warm)' }} />
          </div>
        ) : status?.status === 'failed' ? (
          <div style={{
            width: 96,
            height: 96,
            margin: '0 auto',
            background: 'rgba(244, 63, 94, 0.1)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <XCircle style={{ width: 48, height: 48, color: '#f43f5e' }} />
          </div>
        ) : (
          <div style={{
            width: 96,
            height: 96,
            margin: '0 auto',
            background: 'linear-gradient(135deg, rgba(212, 165, 116, 0.2), rgba(212, 165, 116, 0.1))',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            boxShadow: '0 4px 20px rgba(212, 165, 116, 0.2)'
          }}>
            <Feather style={{ width: 40, height: 40, color: 'var(--amber-warm)' }} />
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '4px solid rgba(212, 165, 116, 0.2)',
              borderTopColor: 'var(--amber-warm)',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        )}
      </div>

      {/* Title */}
      <h1 className="app-heading-1" style={{ marginBottom: '0.75rem' }}>
        {status?.status === 'complete'
          ? 'Your book is ready!'
          : status?.status === 'failed'
          ? 'Something went sideways'
          : 'Crafting your story'}
      </h1>

      {/* Step label */}
      <p className="app-body" style={{ marginBottom: '2.5rem', opacity: 0.7 }}>
        {status?.status === 'complete'
          ? 'Taking you there now...'
          : status?.status === 'failed'
          ? status.error || 'We hit a snag.'
          : getStepLabel(status?.step)}
      </p>

      {/* Progress bar */}
      {status && status.status !== 'failed' && (
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{
            height: 8,
            background: 'rgba(212, 165, 116, 0.15)',
            borderRadius: 9999,
            overflow: 'hidden'
          }}>
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, var(--amber-warm), var(--amber-glow))',
                transition: 'width 0.5s ease-out',
                width: `${status.progress}%`
              }}
            />
          </div>
          <p className="app-body-sm" style={{ marginTop: '0.75rem' }}>{status.progress}% there</p>
        </div>
      )}

      {/* Error state */}
      {(error || status?.status === 'failed') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            padding: '1rem',
            background: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 12,
            color: '#fda4af',
            fontSize: '0.875rem'
          }}>
            {error || status?.error || "The muses got distracted. Let's try again."}
          </div>
          <button
            onClick={handleRetry}
            className="app-button-secondary"
            style={{ alignSelf: 'center', padding: '0.75rem 1.5rem' }}
          >
            <RefreshCw style={{ width: 16, height: 16 }} />
            Try again
          </button>
        </div>
      )}

      {/* Complete state */}
      {status?.status === 'complete' && status.book_id && (
        <button
          onClick={() => router.push(`/create/read/${status.book_id}`)}
          className="app-button-primary"
          style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}
        >
          <BookOpen style={{ width: 20, height: 20 }} />
          Start reading
        </button>
      )}

      {/* Loading hints */}
      {status?.status === 'running' && (
        <div className="app-card" style={{ marginTop: '3rem', textAlign: 'left' }}>
          <h3 className="app-heading-3" style={{ marginBottom: '0.5rem' }}>While you wait...</h3>
          <p className="app-body-sm">
            We&apos;re writing each scene, checking for consistency, and making sure
            your characters stay true to themselves. This usually takes 2-5 minutes.
          </p>
        </div>
      )}

      {/* Subtle ambient decoration */}
      {status?.status === 'running' && (
        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: 4 }}>
          {[...Array(3)].map((_, i) => (
            <span
              key={i}
              style={{
                width: 6,
                height: 6,
                background: 'var(--amber-warm)',
                borderRadius: '50%',
                opacity: 0.5,
                animation: `pulse 1.5s ease-in-out infinite`,
                animationDelay: `${i * 0.3}s`
              }}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
}
