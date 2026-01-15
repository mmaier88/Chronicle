import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { JOB_RECOVERY_CONFIG } from '@/lib/job-recovery'

/**
 * GET /api/health/jobs
 *
 * Health check endpoint that reports on stuck jobs.
 * This should be called by external monitoring (e.g., uptime robot, cron-job.org)
 * to ensure the auto-resume system is working.
 *
 * Returns:
 * - 200 OK if no stuck jobs or all are being handled
 * - 503 Service Unavailable if there are stuck jobs that aren't being recovered
 */
export async function GET(request: NextRequest) {
  // Allow public access for monitoring tools
  // (This only reports counts, no sensitive data)

  const supabase = createServiceClient()

  // Calculate cutoff time
  const cutoffTime = new Date()
  cutoffTime.setMinutes(cutoffTime.getMinutes() - JOB_RECOVERY_CONFIG.STALE_TIMEOUT_MINUTES)

  // Find stuck jobs
  const { data: stuckJobs, error: stuckError } = await supabase
    .from('vibe_jobs')
    .select('id, status, step, progress, auto_resume_attempts, updated_at')
    .in('status', ['running', 'queued'])
    .lt('updated_at', cutoffTime.toISOString())
    .order('updated_at', { ascending: true })

  if (stuckError) {
    return NextResponse.json(
      { status: 'error', message: 'Failed to query jobs' },
      { status: 500 }
    )
  }

  // Categorize stuck jobs
  const recoverableJobs = (stuckJobs || []).filter(
    j => (j.auto_resume_attempts || 0) < JOB_RECOVERY_CONFIG.MAX_AUTO_RESUME_ATTEMPTS
  )
  const failedJobs = (stuckJobs || []).filter(
    j => (j.auto_resume_attempts || 0) >= JOB_RECOVERY_CONFIG.MAX_AUTO_RESUME_ATTEMPTS
  )

  // Calculate staleness for worst case
  const oldestStuckJob = stuckJobs?.[0]
  const oldestStaleMinutes = oldestStuckJob
    ? Math.round((Date.now() - new Date(oldestStuckJob.updated_at).getTime()) / 60000)
    : 0

  const response = {
    status: recoverableJobs.length === 0 ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    stuck_jobs: {
      total: stuckJobs?.length || 0,
      recoverable: recoverableJobs.length,
      permanently_failed: failedJobs.length,
      oldest_stale_minutes: oldestStaleMinutes,
    },
    config: {
      stale_timeout_minutes: JOB_RECOVERY_CONFIG.STALE_TIMEOUT_MINUTES,
      max_auto_resume_attempts: JOB_RECOVERY_CONFIG.MAX_AUTO_RESUME_ATTEMPTS,
    },
  }

  // Return 503 if there are recoverable stuck jobs that have been stuck for too long
  // This indicates the auto-resume system isn't working properly
  const criticalThresholdMinutes = JOB_RECOVERY_CONFIG.STALE_TIMEOUT_MINUTES * 3

  if (recoverableJobs.length > 0 && oldestStaleMinutes > criticalThresholdMinutes) {
    return NextResponse.json(
      {
        ...response,
        status: 'critical',
        message: `${recoverableJobs.length} stuck job(s) not being recovered. Oldest: ${oldestStaleMinutes} minutes stale.`,
      },
      { status: 503 }
    )
  }

  return NextResponse.json(response)
}
