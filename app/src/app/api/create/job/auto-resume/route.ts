import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { JOB_RECOVERY_CONFIG } from '@/lib/job-recovery'

// Use centralized config
const {
  STALE_TIMEOUT_MINUTES,
  MAX_JOBS_PER_RUN,
  MAX_AUTO_RESUME_ATTEMPTS,
} = JOB_RECOVERY_CONFIG

/**
 * POST /api/create/job/auto-resume
 *
 * Cron job that automatically resumes stuck jobs.
 * Runs every 5 minutes via Vercel cron.
 *
 * A job is stuck if:
 * - status is 'running' or 'queued'
 * - updated_at is older than STALE_TIMEOUT_MINUTES
 * - auto_resume_attempts < MAX_AUTO_RESUME_ATTEMPTS
 */
export async function POST(request: NextRequest) {
  // Verify cron secret
  const cronSecret = request.headers.get('x-cron-secret') || request.headers.get('authorization')?.replace('Bearer ', '')

  if (cronSecret !== process.env.CRON_SECRET) {
    console.log('[AutoResume] Unauthorized - invalid cron secret')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  console.log('[AutoResume] Starting auto-resume cron job...')

  const supabase = createServiceClient()

  // Calculate cutoff time
  const cutoffTime = new Date()
  cutoffTime.setMinutes(cutoffTime.getMinutes() - STALE_TIMEOUT_MINUTES)

  // Find stuck jobs
  const { data: stuckJobs, error: fetchError } = await supabase
    .from('vibe_jobs')
    .select('id, user_id, book_id, status, step, progress, auto_resume_attempts, updated_at')
    .in('status', ['running', 'queued'])
    .lt('updated_at', cutoffTime.toISOString())
    .lt('auto_resume_attempts', MAX_AUTO_RESUME_ATTEMPTS)
    .order('updated_at', { ascending: true })
    .limit(MAX_JOBS_PER_RUN)

  if (fetchError) {
    console.error('[AutoResume] Error fetching stuck jobs:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }

  if (!stuckJobs || stuckJobs.length === 0) {
    console.log('[AutoResume] No stuck jobs found')
    return NextResponse.json({
      message: 'No stuck jobs found',
      processed: 0,
      duration_ms: Date.now() - startTime
    })
  }

  console.log(`[AutoResume] Found ${stuckJobs.length} stuck jobs:`, stuckJobs.map(j => ({
    id: j.id,
    step: j.step,
    attempts: j.auto_resume_attempts,
    stale_minutes: Math.round((Date.now() - new Date(j.updated_at).getTime()) / 60000)
  })))

  const results: Array<{ jobId: string; success: boolean; error?: string }> = []

  // Process each stuck job
  for (const job of stuckJobs) {
    try {
      console.log(`[AutoResume] Resuming job ${job.id} (step: ${job.step}, attempt: ${(job.auto_resume_attempts || 0) + 1})`)

      // Increment auto_resume_attempts
      await supabase
        .from('vibe_jobs')
        .update({ auto_resume_attempts: (job.auto_resume_attempts || 0) + 1 })
        .eq('id', job.id)

      // Call the tick endpoint internally
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const tickUrl = `${baseUrl}/api/create/job/${job.id}/tick`

      const tickResponse = await fetch(tickUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': process.env.CRON_SECRET || '',
          'x-auto-resume': 'true',
          'x-user-id': job.user_id // Pass user ID for service auth
        }
      })

      if (tickResponse.ok) {
        const tickResult = await tickResponse.json()
        console.log(`[AutoResume] Job ${job.id} tick success:`, tickResult.status, tickResult.step || tickResult.message)
        results.push({ jobId: job.id, success: true })
      } else {
        const errorText = await tickResponse.text()
        console.error(`[AutoResume] Job ${job.id} tick failed:`, tickResponse.status, errorText)
        results.push({ jobId: job.id, success: false, error: errorText })
      }
    } catch (error) {
      console.error(`[AutoResume] Error processing job ${job.id}:`, error)
      results.push({
        jobId: job.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  // Check for jobs that have exceeded max attempts and mark them as failed
  const { data: failedJobs } = await supabase
    .from('vibe_jobs')
    .select('id, book_id, user_id')
    .in('status', ['running', 'queued'])
    .gte('auto_resume_attempts', MAX_AUTO_RESUME_ATTEMPTS)

  if (failedJobs && failedJobs.length > 0) {
    console.log(`[AutoResume] Marking ${failedJobs.length} jobs as permanently failed`)

    await supabase
      .from('vibe_jobs')
      .update({
        status: 'failed',
        error: `Generation failed after ${MAX_AUTO_RESUME_ATTEMPTS} automatic resume attempts. Please try creating a new story.`
      })
      .in('id', failedJobs.map(j => j.id))

    // TODO: Send notification emails to users about failed jobs
  }

  const successCount = results.filter(r => r.success).length
  const failCount = results.filter(r => !r.success).length
  const duration = Date.now() - startTime

  console.log(`[AutoResume] Completed: ${successCount} succeeded, ${failCount} failed, ${duration}ms`)

  return NextResponse.json({
    message: `Processed ${stuckJobs.length} stuck jobs`,
    processed: stuckJobs.length,
    succeeded: successCount,
    failed: failCount,
    marked_as_failed: failedJobs?.length || 0,
    duration_ms: duration,
    results
  })
}

/**
 * GET /api/create/job/auto-resume
 *
 * Check for stuck jobs without processing them (for debugging)
 */
export async function GET(request: NextRequest) {
  // Verify cron secret or admin
  const cronSecret = request.headers.get('x-cron-secret') || request.headers.get('authorization')?.replace('Bearer ', '')

  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const cutoffTime = new Date()
  cutoffTime.setMinutes(cutoffTime.getMinutes() - STALE_TIMEOUT_MINUTES)

  const { data: stuckJobs, error } = await supabase
    .from('vibe_jobs')
    .select('id, user_id, book_id, status, step, progress, auto_resume_attempts, updated_at, created_at')
    .in('status', ['running', 'queued'])
    .lt('updated_at', cutoffTime.toISOString())
    .order('updated_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }

  return NextResponse.json({
    stuckJobs: stuckJobs || [],
    count: stuckJobs?.length || 0,
    stale_timeout_minutes: STALE_TIMEOUT_MINUTES,
    max_auto_resume_attempts: MAX_AUTO_RESUME_ATTEMPTS
  })
}
