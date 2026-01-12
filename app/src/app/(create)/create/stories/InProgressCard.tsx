'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookOpen, AlertCircle, RefreshCw, Trash2, Loader2, Play } from 'lucide-react'
import { VibeJobStatus } from '@/types/chronicle'

interface InProgressCardProps {
  story: {
    id: string
    title: string
    status: string
    job: {
      id: string
      status: VibeJobStatus
      step: string | null
      progress: number
      error: string | null
      updated_at: string
    }
    isStale: boolean
  }
}

export function InProgressCard({ story }: InProgressCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isResuming, setIsResuming] = useState(false)

  const { job, isStale } = story
  const isFailed = job.status === 'failed'
  const isRunning = job.status === 'running' || job.status === 'queued'

  // Show as stuck if stale or failed
  const isStuck = isStale || isFailed

  const handleResume = async () => {
    setIsResuming(true)
    // Navigate to the generating page which will auto-resume
    router.push(`/create/generating/${job.id}`)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this story? This cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/create/book/${story.id}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        throw new Error('Failed to delete')
      }

      router.refresh()
    } catch (err) {
      console.error('Delete failed:', err)
      alert('Failed to delete story')
      setIsDeleting(false)
    }
  }

  const getStatusText = () => {
    if (isFailed) return job.error || 'Generation failed'
    if (isStale) return 'Generation appears stuck'
    if (job.step) {
      const step = job.step
      if (step === 'constitution') return 'Creating story foundation...'
      if (step === 'plan') return 'Planning chapters...'
      if (step.startsWith('write_')) {
        const match = step.match(/write_ch(\d+)_s(\d+)/)
        if (match) {
          return `Writing chapter ${parseInt(match[1]) + 1}, section ${parseInt(match[2]) + 1}...`
        }
      }
      if (step === 'finalize') return 'Finalizing...'
    }
    return 'Generating...'
  }

  return (
    <div
      className="app-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        opacity: isStuck ? 1 : 0.8,
        borderLeft: isStuck ? '3px solid var(--error-red, #ef4444)' : undefined
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
        <div style={{
          width: 48,
          height: 48,
          background: isStuck ? 'rgba(239, 68, 68, 0.1)' : 'rgba(26, 39, 68, 0.5)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {isStuck ? (
            <AlertCircle style={{ width: 20, height: 20, color: 'var(--error-red, #ef4444)' }} />
          ) : (
            <BookOpen style={{ width: 20, height: 20, color: 'var(--moon-soft)' }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 className="app-heading-3" style={{ marginBottom: '0.25rem' }}>
            {story.title || 'Untitled'}
          </h3>
          <p className="app-body-sm" style={{
            color: isStuck ? 'var(--error-red, #ef4444)' : undefined,
            opacity: isStuck ? 1 : 0.7
          }}>
            {getStatusText()}
          </p>
          {!isStuck && job.progress > 0 && (
            <div style={{
              marginTop: '0.5rem',
              height: 4,
              background: 'rgba(212, 165, 116, 0.2)',
              borderRadius: 2,
              overflow: 'hidden',
              maxWidth: 200
            }}>
              <div style={{
                height: '100%',
                width: `${job.progress}%`,
                background: 'var(--amber-warm)',
                transition: 'width 0.3s ease'
              }} />
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem' }}>
        {isStuck ? (
          <>
            <button
              onClick={handleResume}
              disabled={isResuming || isDeleting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.5rem 0.75rem',
                borderRadius: 8,
                background: 'var(--amber-warm)',
                color: 'var(--night-deep)',
                fontSize: '0.8125rem',
                fontWeight: 500,
                border: 'none',
                cursor: isResuming ? 'wait' : 'pointer',
                opacity: isResuming || isDeleting ? 0.6 : 1
              }}
            >
              {isResuming ? (
                <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
              ) : (
                <Play style={{ width: 14, height: 14 }} />
              )}
              Resume
            </button>
            <button
              onClick={handleDelete}
              disabled={isResuming || isDeleting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.5rem 0.75rem',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--error-red, #ef4444)',
                fontSize: '0.8125rem',
                fontWeight: 500,
                border: 'none',
                cursor: isDeleting ? 'wait' : 'pointer',
                opacity: isResuming || isDeleting ? 0.6 : 1
              }}
            >
              {isDeleting ? (
                <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
              ) : (
                <Trash2 style={{ width: 14, height: 14 }} />
              )}
              Delete
            </button>
          </>
        ) : (
          <Link
            href={`/create/generating/${job.id}`}
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
              textDecoration: 'none'
            }}
          >
            <RefreshCw style={{ width: 14, height: 14 }} />
            View Progress
          </Link>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
