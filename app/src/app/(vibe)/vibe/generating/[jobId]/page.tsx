'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loader2, CheckCircle, XCircle, BookOpen, Sparkles, RefreshCw, Feather } from 'lucide-react'

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
      const response = await fetch(`/api/vibe/job/${jobId}/status`)
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
      const response = await fetch(`/api/vibe/job/${jobId}/tick`, {
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
        router.push(`/vibe/read/${status.book_id}`)
      }, 2000)
    }
  }, [status, router])

  const handleRetry = async () => {
    setError(null)
    await tickJob()
  }

  return (
    <div className="max-w-xl mx-auto text-center py-12">
      {/* Icon */}
      <div className="mb-10">
        {status?.status === 'complete' ? (
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-amber-100 to-rose-100 rounded-full flex items-center justify-center shadow-lg shadow-amber-100/50">
            <CheckCircle className="w-12 h-12 text-amber-600" />
          </div>
        ) : status?.status === 'failed' ? (
          <div className="w-24 h-24 mx-auto bg-rose-50 rounded-full flex items-center justify-center">
            <XCircle className="w-12 h-12 text-rose-500" />
          </div>
        ) : (
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-amber-100 to-rose-100 rounded-full flex items-center justify-center relative shadow-lg shadow-amber-100/50">
            <Feather className="w-10 h-10 text-amber-700" />
            <div className="absolute inset-0 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin" />
          </div>
        )}
      </div>

      {/* Title */}
      <h1 className="font-serif text-3xl md:text-4xl text-amber-950 tracking-tight mb-3">
        {status?.status === 'complete'
          ? 'Your book is ready!'
          : status?.status === 'failed'
          ? 'Something went sideways'
          : 'Crafting your story'}
      </h1>

      {/* Step label */}
      <p className="text-lg text-amber-700/70 mb-10">
        {status?.status === 'complete'
          ? 'Taking you there now...'
          : status?.status === 'failed'
          ? status.error || 'We hit a snag.'
          : getStepLabel(status?.step)}
      </p>

      {/* Progress bar */}
      {status && status.status !== 'failed' && (
        <div className="mb-10">
          <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-500 ease-out"
              style={{ width: `${status.progress}%` }}
            />
          </div>
          <p className="text-sm text-amber-600/70 mt-3">{status.progress}% there</p>
        </div>
      )}

      {/* Error state */}
      {(error || status?.status === 'failed') && (
        <div className="space-y-4">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
            {error || status?.error || "The muses got distracted. Let's try again."}
          </div>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-950 text-amber-50 rounded-full font-medium hover:bg-amber-900 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      )}

      {/* Complete state */}
      {status?.status === 'complete' && status.book_id && (
        <button
          onClick={() => router.push(`/vibe/read/${status.book_id}`)}
          className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-600 to-rose-500 text-white rounded-full font-medium text-lg shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 hover:scale-[1.02] transition-all duration-200"
        >
          <BookOpen className="w-5 h-5" />
          Start reading
        </button>
      )}

      {/* Loading hints */}
      {status?.status === 'running' && (
        <div className="mt-12 p-6 bg-white/70 backdrop-blur-sm rounded-2xl border border-amber-100">
          <h3 className="font-serif text-lg text-amber-900 mb-2">While you wait...</h3>
          <p className="text-sm text-amber-700/70 leading-relaxed">
            We&apos;re writing each scene, checking for consistency, and making sure
            your characters stay true to themselves. This usually takes 2-5 minutes.
          </p>
        </div>
      )}

      {/* Subtle ambient decoration */}
      {status?.status === 'running' && (
        <div className="mt-8 flex justify-center gap-1">
          {[...Array(3)].map((_, i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 bg-amber-300 rounded-full animate-pulse"
              style={{ animationDelay: `${i * 0.3}s` }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
