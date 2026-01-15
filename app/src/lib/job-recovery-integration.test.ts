/**
 * Integration tests for job recovery system
 *
 * These tests verify the CRITICAL requirement that stuck jobs
 * are ALWAYS detected and recovered. A stuck job is unacceptable.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  isJobStuck,
  canAutoResume,
  JOB_RECOVERY_CONFIG,
  JobStatus,
} from './job-recovery'

describe('Job Recovery - Critical Integration Tests', () => {
  const NOW = new Date('2026-01-15T12:00:00Z')

  const createJob = (overrides: Partial<JobStatus> = {}): JobStatus => ({
    id: 'test-job-id',
    status: 'running',
    step: 'write_ch0_s1',
    progress: 25,
    updated_at: NOW.toISOString(),
    auto_resume_attempts: 0,
    error: null,
    ...overrides,
  })

  const minutesAgo = (minutes: number): string => {
    const date = new Date(NOW)
    date.setMinutes(date.getMinutes() - minutes)
    return date.toISOString()
  }

  const hoursAgo = (hours: number): string => {
    const date = new Date(NOW)
    date.setHours(date.getHours() - hours)
    return date.toISOString()
  }

  describe('CRITICAL: Jobs stuck for hours MUST be detected', () => {
    // This test represents the exact scenario that happened in production
    it('detects job stuck for 9 hours with 0 resume attempts', () => {
      const stuckJob = createJob({
        status: 'running',
        step: 'write_ch0_s1',
        progress: 25,
        updated_at: hoursAgo(9),
        auto_resume_attempts: 0,
      })

      expect(isJobStuck(stuckJob, NOW)).toBe(true)
      expect(canAutoResume(stuckJob, NOW)).toBe(true)
    })

    it('detects job stuck for 1 hour', () => {
      const stuckJob = createJob({
        status: 'running',
        updated_at: hoursAgo(1),
        auto_resume_attempts: 0,
      })

      expect(isJobStuck(stuckJob, NOW)).toBe(true)
      expect(canAutoResume(stuckJob, NOW)).toBe(true)
    })

    it('detects job stuck for 30 minutes', () => {
      const stuckJob = createJob({
        status: 'running',
        updated_at: minutesAgo(30),
        auto_resume_attempts: 0,
      })

      expect(isJobStuck(stuckJob, NOW)).toBe(true)
      expect(canAutoResume(stuckJob, NOW)).toBe(true)
    })

    it('detects job stuck for exactly stale threshold + 1 minute', () => {
      const stuckJob = createJob({
        status: 'running',
        updated_at: minutesAgo(JOB_RECOVERY_CONFIG.STALE_TIMEOUT_MINUTES + 1),
        auto_resume_attempts: 0,
      })

      expect(isJobStuck(stuckJob, NOW)).toBe(true)
      expect(canAutoResume(stuckJob, NOW)).toBe(true)
    })
  })

  describe('CRITICAL: All running/queued statuses are monitored', () => {
    const staleTime = minutesAgo(JOB_RECOVERY_CONFIG.STALE_TIMEOUT_MINUTES + 5)

    it('detects stuck running job', () => {
      const job = createJob({ status: 'running', updated_at: staleTime })
      expect(isJobStuck(job, NOW)).toBe(true)
    })

    it('detects stuck queued job', () => {
      const job = createJob({ status: 'queued', updated_at: staleTime })
      expect(isJobStuck(job, NOW)).toBe(true)
    })

    it('ignores completed jobs (not stuck)', () => {
      const job = createJob({ status: 'complete', updated_at: staleTime })
      expect(isJobStuck(job, NOW)).toBe(false)
    })

    it('ignores failed jobs (not stuck)', () => {
      const job = createJob({ status: 'failed', updated_at: staleTime })
      expect(isJobStuck(job, NOW)).toBe(false)
    })
  })

  describe('CRITICAL: Jobs at any generation step are detected', () => {
    const staleTime = minutesAgo(10)

    const steps = [
      'created',
      'constitution',
      'plan',
      'write_ch0_s0',
      'write_ch0_s1',
      'write_ch1_s0',
      'write_ch5_s3',
      'finalize',
    ]

    steps.forEach(step => {
      it(`detects stuck job at step: ${step}`, () => {
        const job = createJob({ status: 'running', step, updated_at: staleTime })
        expect(isJobStuck(job, NOW)).toBe(true)
        expect(canAutoResume(job, NOW)).toBe(true)
      })
    })
  })

  describe('CRITICAL: Recovery is blocked only when appropriate', () => {
    it('blocks recovery after max attempts exceeded', () => {
      const job = createJob({
        updated_at: minutesAgo(10),
        auto_resume_attempts: JOB_RECOVERY_CONFIG.MAX_AUTO_RESUME_ATTEMPTS,
      })

      expect(isJobStuck(job, NOW)).toBe(true)
      expect(canAutoResume(job, NOW)).toBe(false) // Should NOT auto-resume
    })

    it('allows recovery up to max attempts - 1', () => {
      const job = createJob({
        updated_at: minutesAgo(10),
        auto_resume_attempts: JOB_RECOVERY_CONFIG.MAX_AUTO_RESUME_ATTEMPTS - 1,
      })

      expect(canAutoResume(job, NOW)).toBe(true)
    })
  })

  describe('CRITICAL: Stale timeout configuration is reasonable', () => {
    it('stale timeout is between 2 and 15 minutes', () => {
      // Jobs should be detected as stuck within a reasonable timeframe
      // Not too short (to avoid false positives during normal API calls)
      // Not too long (to catch stuck jobs quickly)
      expect(JOB_RECOVERY_CONFIG.STALE_TIMEOUT_MINUTES).toBeGreaterThanOrEqual(2)
      expect(JOB_RECOVERY_CONFIG.STALE_TIMEOUT_MINUTES).toBeLessThanOrEqual(15)
    })

    it('max auto resume attempts allows sufficient retries', () => {
      // Should be enough to handle transient issues but not infinite
      expect(JOB_RECOVERY_CONFIG.MAX_AUTO_RESUME_ATTEMPTS).toBeGreaterThanOrEqual(10)
      expect(JOB_RECOVERY_CONFIG.MAX_AUTO_RESUME_ATTEMPTS).toBeLessThanOrEqual(30)
    })

    it('jobs per run is sufficient for typical load', () => {
      expect(JOB_RECOVERY_CONFIG.MAX_JOBS_PER_RUN).toBeGreaterThanOrEqual(5)
    })
  })

  describe('Simulated auto-resume query behavior', () => {
    // Simulate the query used in the auto-resume endpoint
    const simulateAutoResumeQuery = (jobs: JobStatus[], cutoffTime: Date): JobStatus[] => {
      return jobs.filter(job => {
        const isActive = job.status === 'running' || job.status === 'queued'
        const isStale = new Date(job.updated_at) < cutoffTime
        const canRetry = (job.auto_resume_attempts || 0) < JOB_RECOVERY_CONFIG.MAX_AUTO_RESUME_ATTEMPTS
        return isActive && isStale && canRetry
      })
    }

    it('query finds the exact stuck job scenario from production', () => {
      const cutoffTime = new Date(NOW)
      cutoffTime.setMinutes(cutoffTime.getMinutes() - JOB_RECOVERY_CONFIG.STALE_TIMEOUT_MINUTES)

      const jobs = [
        createJob({
          id: 'stuck-job',
          status: 'running',
          step: 'write_ch0_s1',
          updated_at: hoursAgo(9),
          auto_resume_attempts: 0,
        }),
        createJob({
          id: 'completed-job',
          status: 'complete',
          updated_at: hoursAgo(10),
        }),
        createJob({
          id: 'recent-job',
          status: 'running',
          updated_at: minutesAgo(1),
        }),
      ]

      const stuckJobs = simulateAutoResumeQuery(jobs, cutoffTime)

      expect(stuckJobs).toHaveLength(1)
      expect(stuckJobs[0].id).toBe('stuck-job')
    })

    it('query finds multiple stuck jobs', () => {
      const cutoffTime = new Date(NOW)
      cutoffTime.setMinutes(cutoffTime.getMinutes() - JOB_RECOVERY_CONFIG.STALE_TIMEOUT_MINUTES)

      const jobs = [
        createJob({ id: 'stuck-1', status: 'running', updated_at: hoursAgo(2) }),
        createJob({ id: 'stuck-2', status: 'queued', updated_at: hoursAgo(1) }),
        createJob({ id: 'stuck-3', status: 'running', updated_at: minutesAgo(30) }),
        createJob({ id: 'recent', status: 'running', updated_at: minutesAgo(1) }),
      ]

      const stuckJobs = simulateAutoResumeQuery(jobs, cutoffTime)

      expect(stuckJobs).toHaveLength(3)
      expect(stuckJobs.map(j => j.id)).toContain('stuck-1')
      expect(stuckJobs.map(j => j.id)).toContain('stuck-2')
      expect(stuckJobs.map(j => j.id)).toContain('stuck-3')
    })

    it('query excludes jobs that exceeded max attempts', () => {
      const cutoffTime = new Date(NOW)
      cutoffTime.setMinutes(cutoffTime.getMinutes() - JOB_RECOVERY_CONFIG.STALE_TIMEOUT_MINUTES)

      const jobs = [
        createJob({
          id: 'should-recover',
          status: 'running',
          updated_at: hoursAgo(1),
          auto_resume_attempts: 5,
        }),
        createJob({
          id: 'should-not-recover',
          status: 'running',
          updated_at: hoursAgo(1),
          auto_resume_attempts: JOB_RECOVERY_CONFIG.MAX_AUTO_RESUME_ATTEMPTS,
        }),
      ]

      const stuckJobs = simulateAutoResumeQuery(jobs, cutoffTime)

      expect(stuckJobs).toHaveLength(1)
      expect(stuckJobs[0].id).toBe('should-recover')
    })
  })
})
