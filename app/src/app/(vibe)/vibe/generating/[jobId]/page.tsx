'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loader2, CheckCircle, XCircle, BookOpen, Sparkles, RefreshCw } from 'lucide-react'

interface JobStatus {
  id: string
  book_id: string | null
  status: 'queued' | 'running' | 'failed' | 'complete'
  step: string | null
  progress: number
  error: string | null
}

const STEP_LABELS: Record<string, string> = {
  created: 'Initializing...',
  constitution: 'Creating story DNA...',
  plan: 'Planning chapters...',
  finalize: 'Finalizing book...',
  complete: 'Complete!',
}

function getStepLabel(step: string | null | undefined): string {
  if (!step) return 'Starting...'
  if (STEP_LABELS[step]) return STEP_LABELS[step]

  // Parse write_chX_sY
  const writeMatch = step.match(/^write_ch(\d+)_s(\d+)$/)
  if (writeMatch) {
    const ch = parseInt(writeMatch[1]) + 1
    const s = parseInt(writeMatch[2]) + 1
    return `Writing Chapter ${ch}, Section ${s}...`
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
      <div className="mb-8">
        {status?.status === 'complete' ? (
          <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        ) : status?.status === 'failed' ? (
          <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
        ) : (
          <div className="w-20 h-20 mx-auto bg-purple-100 rounded-full flex items-center justify-center relative">
            <Sparkles className="w-10 h-10 text-purple-600" />
            <div className="absolute inset-0 rounded-full border-4 border-purple-300 border-t-purple-600 animate-spin" />
          </div>
        )}
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {status?.status === 'complete'
          ? 'Your Book is Ready!'
          : status?.status === 'failed'
          ? 'Generation Failed'
          : 'Creating Your Book'}
      </h1>

      {/* Step label */}
      <p className="text-gray-600 mb-8">
        {status?.status === 'complete'
          ? 'Redirecting to your book...'
          : status?.status === 'failed'
          ? status.error || 'An error occurred'
          : getStepLabel(status?.step)}
      </p>

      {/* Progress bar */}
      {status && status.status !== 'failed' && (
        <div className="mb-8">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-500"
              style={{ width: `${status.progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">{status.progress}% complete</p>
        </div>
      )}

      {/* Error state */}
      {(error || status?.status === 'failed') && (
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error || status?.error || 'An error occurred during generation'}
          </div>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      )}

      {/* Complete state */}
      {status?.status === 'complete' && status.book_id && (
        <button
          onClick={() => router.push(`/vibe/read/${status.book_id}`)}
          className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
        >
          <BookOpen className="w-5 h-5" />
          Read Your Book
        </button>
      )}

      {/* Loading hints */}
      {status?.status === 'running' && (
        <div className="mt-12 p-6 bg-white rounded-xl border border-gray-200">
          <h3 className="font-medium text-gray-900 mb-2">While you wait...</h3>
          <p className="text-sm text-gray-600">
            We&apos;re writing each section, checking for consistency, and ensuring
            your characters stay true to themselves. This typically takes 2-5 minutes.
          </p>
        </div>
      )}
    </div>
  )
}
