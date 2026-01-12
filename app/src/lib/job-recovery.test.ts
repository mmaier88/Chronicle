import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  isJobStuck,
  hasExceededMaxAttempts,
  canAutoResume,
  getJobStatusMessage,
  getMinutesSinceUpdate,
  JOB_RECOVERY_CONFIG,
  JobStatus,
} from './job-recovery'

describe('Job Recovery', () => {
  // Fixed "now" time for consistent tests
  const NOW = new Date('2026-01-12T15:00:00Z')

  // Helper to create a job with specific updated_at time
  const createJob = (overrides: Partial<JobStatus> = {}): JobStatus => ({
    id: 'test-job-id',
    status: 'running',
    step: 'write_ch0_s0',
    progress: 50,
    updated_at: NOW.toISOString(),
    auto_resume_attempts: 0,
    error: null,
    ...overrides,
  })

  // Helper to create a date X minutes before NOW
  const minutesAgo = (minutes: number): string => {
    const date = new Date(NOW)
    date.setMinutes(date.getMinutes() - minutes)
    return date.toISOString()
  }

  describe('isJobStuck', () => {
    it('returns false for jobs updated recently', () => {
      const job = createJob({ updated_at: minutesAgo(1) })
      expect(isJobStuck(job, NOW)).toBe(false)
    })

    it('returns false for jobs updated exactly at stale timeout', () => {
      const job = createJob({ updated_at: minutesAgo(JOB_RECOVERY_CONFIG.STALE_TIMEOUT_MINUTES) })
      expect(isJobStuck(job, NOW)).toBe(false)
    })

    it('returns true for jobs older than stale timeout', () => {
      const job = createJob({ updated_at: minutesAgo(JOB_RECOVERY_CONFIG.STALE_TIMEOUT_MINUTES + 1) })
      expect(isJobStuck(job, NOW)).toBe(true)
    })

    it('returns false for completed jobs even if stale', () => {
      const job = createJob({
        status: 'complete',
        updated_at: minutesAgo(60),
      })
      expect(isJobStuck(job, NOW)).toBe(false)
    })

    it('returns false for failed jobs even if stale', () => {
      const job = createJob({
        status: 'failed',
        updated_at: minutesAgo(60),
      })
      expect(isJobStuck(job, NOW)).toBe(false)
    })

    it('returns true for queued jobs that are stale', () => {
      const job = createJob({
        status: 'queued',
        updated_at: minutesAgo(10),
      })
      expect(isJobStuck(job, NOW)).toBe(true)
    })

    it('returns true for running jobs that are stale', () => {
      const job = createJob({
        status: 'running',
        updated_at: minutesAgo(10),
      })
      expect(isJobStuck(job, NOW)).toBe(true)
    })
  })

  describe('hasExceededMaxAttempts', () => {
    it('returns false when attempts are below max', () => {
      const job = createJob({ auto_resume_attempts: 0 })
      expect(hasExceededMaxAttempts(job)).toBe(false)
    })

    it('returns false when attempts are just below max', () => {
      const job = createJob({
        auto_resume_attempts: JOB_RECOVERY_CONFIG.MAX_AUTO_RESUME_ATTEMPTS - 1,
      })
      expect(hasExceededMaxAttempts(job)).toBe(false)
    })

    it('returns true when attempts equal max', () => {
      const job = createJob({
        auto_resume_attempts: JOB_RECOVERY_CONFIG.MAX_AUTO_RESUME_ATTEMPTS,
      })
      expect(hasExceededMaxAttempts(job)).toBe(true)
    })

    it('returns true when attempts exceed max', () => {
      const job = createJob({
        auto_resume_attempts: JOB_RECOVERY_CONFIG.MAX_AUTO_RESUME_ATTEMPTS + 5,
      })
      expect(hasExceededMaxAttempts(job)).toBe(true)
    })

    it('handles undefined auto_resume_attempts as 0', () => {
      const job = createJob()
      delete (job as any).auto_resume_attempts
      expect(hasExceededMaxAttempts(job)).toBe(false)
    })
  })

  describe('canAutoResume', () => {
    it('returns true for stuck job with no attempts', () => {
      const job = createJob({
        updated_at: minutesAgo(10),
        auto_resume_attempts: 0,
      })
      expect(canAutoResume(job, NOW)).toBe(true)
    })

    it('returns true for stuck job with some attempts', () => {
      const job = createJob({
        updated_at: minutesAgo(10),
        auto_resume_attempts: 5,
      })
      expect(canAutoResume(job, NOW)).toBe(true)
    })

    it('returns false for stuck job that exceeded max attempts', () => {
      const job = createJob({
        updated_at: minutesAgo(10),
        auto_resume_attempts: JOB_RECOVERY_CONFIG.MAX_AUTO_RESUME_ATTEMPTS,
      })
      expect(canAutoResume(job, NOW)).toBe(false)
    })

    it('returns false for recent job even with no attempts', () => {
      const job = createJob({
        updated_at: minutesAgo(1),
        auto_resume_attempts: 0,
      })
      expect(canAutoResume(job, NOW)).toBe(false)
    })

    it('returns false for completed job', () => {
      const job = createJob({
        status: 'complete',
        updated_at: minutesAgo(10),
        auto_resume_attempts: 0,
      })
      expect(canAutoResume(job, NOW)).toBe(false)
    })
  })

  describe('getJobStatusMessage', () => {
    it('returns "Completed" for complete jobs', () => {
      const job = createJob({ status: 'complete' })
      expect(getJobStatusMessage(job, NOW)).toBe('Completed')
    })

    it('returns error message for failed jobs', () => {
      const job = createJob({
        status: 'failed',
        error: 'API rate limit exceeded',
      })
      expect(getJobStatusMessage(job, NOW)).toBe('API rate limit exceeded')
    })

    it('returns generic message for failed jobs without error', () => {
      const job = createJob({
        status: 'failed',
        error: null,
      })
      expect(getJobStatusMessage(job, NOW)).toBe('Generation failed')
    })

    it('returns "will auto-resume" message for stuck jobs', () => {
      const job = createJob({
        updated_at: minutesAgo(10),
        auto_resume_attempts: 0,
      })
      expect(getJobStatusMessage(job, NOW)).toContain('auto-resume')
    })

    it('returns "failed after multiple attempts" for exceeded max attempts', () => {
      const job = createJob({
        updated_at: minutesAgo(10),
        auto_resume_attempts: JOB_RECOVERY_CONFIG.MAX_AUTO_RESUME_ATTEMPTS,
      })
      expect(getJobStatusMessage(job, NOW)).toContain('failed after multiple attempts')
    })

    it('returns step-specific message for constitution step', () => {
      const job = createJob({ step: 'constitution' })
      expect(getJobStatusMessage(job, NOW)).toBe('Creating story foundation...')
    })

    it('returns step-specific message for plan step', () => {
      const job = createJob({ step: 'plan' })
      expect(getJobStatusMessage(job, NOW)).toBe('Planning chapters...')
    })

    it('returns chapter/section info for write steps', () => {
      const job = createJob({ step: 'write_ch2_s1' })
      expect(getJobStatusMessage(job, NOW)).toBe('Writing chapter 3, section 2...')
    })

    it('returns "Finalizing" for finalize step', () => {
      const job = createJob({ step: 'finalize' })
      expect(getJobStatusMessage(job, NOW)).toBe('Finalizing...')
    })

    it('returns "Generating..." for unknown steps', () => {
      const job = createJob({ step: 'unknown_step' })
      expect(getJobStatusMessage(job, NOW)).toBe('Generating...')
    })
  })

  describe('getMinutesSinceUpdate', () => {
    it('returns 0 for jobs updated just now', () => {
      const job = createJob({ updated_at: NOW.toISOString() })
      expect(getMinutesSinceUpdate(job, NOW)).toBe(0)
    })

    it('returns correct minutes for recent updates', () => {
      const job = createJob({ updated_at: minutesAgo(5) })
      expect(getMinutesSinceUpdate(job, NOW)).toBe(5)
    })

    it('returns correct minutes for older updates', () => {
      const job = createJob({ updated_at: minutesAgo(120) })
      expect(getMinutesSinceUpdate(job, NOW)).toBe(120)
    })

    it('rounds to nearest minute', () => {
      const date = new Date(NOW)
      date.setMinutes(date.getMinutes() - 5)
      date.setSeconds(date.getSeconds() - 45) // 5 min 45 sec ago
      const job = createJob({ updated_at: date.toISOString() })
      expect(getMinutesSinceUpdate(job, NOW)).toBe(6) // Rounds to 6
    })
  })

  describe('Configuration', () => {
    it('has reasonable stale timeout', () => {
      expect(JOB_RECOVERY_CONFIG.STALE_TIMEOUT_MINUTES).toBeGreaterThanOrEqual(2)
      expect(JOB_RECOVERY_CONFIG.STALE_TIMEOUT_MINUTES).toBeLessThanOrEqual(30)
    })

    it('has reasonable max auto resume attempts', () => {
      expect(JOB_RECOVERY_CONFIG.MAX_AUTO_RESUME_ATTEMPTS).toBeGreaterThanOrEqual(5)
      expect(JOB_RECOVERY_CONFIG.MAX_AUTO_RESUME_ATTEMPTS).toBeLessThanOrEqual(50)
    })

    it('has reasonable max jobs per run', () => {
      expect(JOB_RECOVERY_CONFIG.MAX_JOBS_PER_RUN).toBeGreaterThanOrEqual(1)
      expect(JOB_RECOVERY_CONFIG.MAX_JOBS_PER_RUN).toBeLessThanOrEqual(50)
    })

    it('includes running and queued as active statuses', () => {
      expect(JOB_RECOVERY_CONFIG.ACTIVE_STATUSES).toContain('running')
      expect(JOB_RECOVERY_CONFIG.ACTIVE_STATUSES).toContain('queued')
    })
  })

  describe('Edge cases', () => {
    it('handles future updated_at dates (clock skew)', () => {
      const future = new Date(NOW)
      future.setMinutes(future.getMinutes() + 10)
      const job = createJob({ updated_at: future.toISOString() })
      expect(isJobStuck(job, NOW)).toBe(false)
    })

    it('handles very old jobs', () => {
      const veryOld = new Date(NOW)
      veryOld.setDate(veryOld.getDate() - 7) // 1 week ago
      const job = createJob({ updated_at: veryOld.toISOString() })
      expect(isJobStuck(job, NOW)).toBe(true)
      expect(getMinutesSinceUpdate(job, NOW)).toBe(7 * 24 * 60) // 10080 minutes
    })

    it('handles invalid step patterns gracefully', () => {
      const job = createJob({ step: 'write_invalid' })
      expect(getJobStatusMessage(job, NOW)).toBe('Generating...')
    })

    it('handles null step', () => {
      const job = createJob({ step: null })
      expect(getJobStatusMessage(job, NOW)).toBe('Generating...')
    })
  })
})
