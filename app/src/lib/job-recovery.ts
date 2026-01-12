/**
 * Job Recovery Logic
 *
 * Utilities for detecting and recovering stuck book generation jobs.
 * Used by both the auto-resume cron and the stories page.
 */

// Configuration
export const JOB_RECOVERY_CONFIG = {
  // Jobs not updated in this many minutes are considered stuck
  STALE_TIMEOUT_MINUTES: 5,

  // Max cron attempts before marking as permanently failed
  MAX_AUTO_RESUME_ATTEMPTS: 20,

  // Max jobs to process per cron run
  MAX_JOBS_PER_RUN: 10,

  // Statuses that indicate an active job
  ACTIVE_STATUSES: ['running', 'queued'] as const,
} as const

export type ActiveJobStatus = typeof JOB_RECOVERY_CONFIG.ACTIVE_STATUSES[number]

export interface JobStatus {
  id: string
  status: string
  step: string | null
  progress: number
  updated_at: string
  auto_resume_attempts?: number
  error?: string | null
}

/**
 * Check if a job is considered stuck based on its updated_at time
 */
export function isJobStuck(job: JobStatus, now: Date = new Date()): boolean {
  if (!JOB_RECOVERY_CONFIG.ACTIVE_STATUSES.includes(job.status as ActiveJobStatus)) {
    return false
  }

  const updatedAt = new Date(job.updated_at)
  const staleMs = JOB_RECOVERY_CONFIG.STALE_TIMEOUT_MINUTES * 60 * 1000
  const timeSinceUpdate = now.getTime() - updatedAt.getTime()

  return timeSinceUpdate > staleMs
}

/**
 * Check if a job has exceeded the maximum auto-resume attempts
 */
export function hasExceededMaxAttempts(job: JobStatus): boolean {
  return (job.auto_resume_attempts || 0) >= JOB_RECOVERY_CONFIG.MAX_AUTO_RESUME_ATTEMPTS
}

/**
 * Check if a job can be auto-resumed
 * (stuck but not exceeded max attempts)
 */
export function canAutoResume(job: JobStatus, now: Date = new Date()): boolean {
  return isJobStuck(job, now) && !hasExceededMaxAttempts(job)
}

/**
 * Get human-readable status for a job
 */
export function getJobStatusMessage(job: JobStatus, now: Date = new Date()): string {
  if (job.status === 'complete') {
    return 'Completed'
  }

  if (job.status === 'failed') {
    return job.error || 'Generation failed'
  }

  if (isJobStuck(job, now)) {
    if (hasExceededMaxAttempts(job)) {
      return 'Generation failed after multiple attempts'
    }
    return 'Generation appears stuck - will auto-resume shortly'
  }

  // Active job - show step info
  const step = job.step || 'starting'

  if (step === 'constitution') return 'Creating story foundation...'
  if (step === 'plan') return 'Planning chapters...'
  if (step.startsWith('write_')) {
    const match = step.match(/write_ch(\d+)_s(\d+)/)
    if (match) {
      return `Writing chapter ${parseInt(match[1]) + 1}, section ${parseInt(match[2]) + 1}...`
    }
  }
  if (step === 'finalize') return 'Finalizing...'

  return 'Generating...'
}

/**
 * Calculate minutes since last update
 */
export function getMinutesSinceUpdate(job: JobStatus, now: Date = new Date()): number {
  const updatedAt = new Date(job.updated_at)
  return Math.round((now.getTime() - updatedAt.getTime()) / 60000)
}
