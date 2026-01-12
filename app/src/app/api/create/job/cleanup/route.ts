import { createServiceClient, getUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Stale job timeout: 1 hour of no activity
const STALE_TIMEOUT_HOURS = 1

/**
 * POST /api/create/job/cleanup
 *
 * Marks stale jobs as failed. A job is stale if:
 * - status is 'running' or 'queued'
 * - updated_at is older than STALE_TIMEOUT_HOURS
 *
 * Can be called:
 * - By users to clean their own stuck jobs
 * - By cron job with CRON_SECRET to clean all stale jobs
 */
export async function POST(request: NextRequest) {
  const supabase = createServiceClient()

  // Check if this is a cron job (cleans ALL stale jobs)
  const cronSecret = request.headers.get('x-cron-secret')
  const isCron = cronSecret === process.env.CRON_SECRET

  // For user requests, get their user ID
  let userId: string | null = null
  if (!isCron) {
    const { user } = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    userId = user.id
  }

  // Calculate cutoff time
  const cutoffTime = new Date()
  cutoffTime.setHours(cutoffTime.getHours() - STALE_TIMEOUT_HOURS)

  // Find stale jobs
  let query = supabase
    .from('vibe_jobs')
    .select('id, book_id, step, status, updated_at')
    .in('status', ['running', 'queued'])
    .lt('updated_at', cutoffTime.toISOString())

  // Filter by user if not cron
  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data: staleJobs, error: fetchError } = await query

  if (fetchError) {
    console.error('[Cleanup] Error fetching stale jobs:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }

  if (!staleJobs || staleJobs.length === 0) {
    return NextResponse.json({
      message: 'No stale jobs found',
      cleaned: 0
    })
  }

  console.log(`[Cleanup] Found ${staleJobs.length} stale jobs:`, staleJobs.map(j => j.id))

  // Mark jobs as failed
  const { error: updateError } = await supabase
    .from('vibe_jobs')
    .update({
      status: 'failed',
      error: `Job timed out after ${STALE_TIMEOUT_HOURS} hour(s) of inactivity`
    })
    .in('id', staleJobs.map(j => j.id))

  if (updateError) {
    console.error('[Cleanup] Error updating jobs:', updateError)
    return NextResponse.json({ error: 'Failed to update jobs' }, { status: 500 })
  }

  // Also update associated books to have a failed indicator
  // (Keep status as 'drafting' but the job failure is tracked)
  const bookIds = staleJobs.map(j => j.book_id).filter(Boolean)
  if (bookIds.length > 0) {
    console.log(`[Cleanup] Associated books:`, bookIds)
  }

  return NextResponse.json({
    message: `Cleaned ${staleJobs.length} stale job(s)`,
    cleaned: staleJobs.length,
    jobIds: staleJobs.map(j => j.id)
  })
}

/**
 * GET /api/create/job/cleanup
 *
 * Check for stale jobs without cleaning them
 */
export async function GET() {
  const { user } = await getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const cutoffTime = new Date()
  cutoffTime.setHours(cutoffTime.getHours() - STALE_TIMEOUT_HOURS)

  const { data: staleJobs, error } = await supabase
    .from('vibe_jobs')
    .select('id, book_id, step, status, updated_at, error')
    .eq('user_id', user.id)
    .in('status', ['running', 'queued'])
    .lt('updated_at', cutoffTime.toISOString())

  if (error) {
    return NextResponse.json({ error: 'Failed to check jobs' }, { status: 500 })
  }

  return NextResponse.json({
    staleJobs: staleJobs || [],
    count: staleJobs?.length || 0
  })
}
