import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/create/job/[jobId]/kick
 *
 * Debug endpoint to manually kick a stuck job.
 * Only works on staging (non-production) environments.
 * No authentication required - FOR DEBUGGING ONLY.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

  // Only allow on staging/development
  const isProduction = process.env.VERCEL_ENV === 'production' ||
                       process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_APP_URL?.includes('staging')

  if (isProduction) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const supabase = createServiceClient()

  // Fetch the job
  const { data: job, error: jobError } = await supabase
    .from('vibe_jobs')
    .select('id, user_id, book_id, status, step, progress, error, updated_at, auto_resume_attempts')
    .eq('id', jobId)
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: 'Job not found', details: jobError }, { status: 404 })
  }

  // Get book info
  const { data: book } = await supabase
    .from('books')
    .select('id, title, source_book_id')
    .eq('id', job.book_id)
    .single()

  console.log(`[Kick] Job ${jobId} status:`, {
    status: job.status,
    step: job.step,
    progress: job.progress,
    error: job.error,
    updated_at: job.updated_at,
    auto_resume_attempts: job.auto_resume_attempts,
    book_id: job.book_id,
    book_title: book?.title,
    source_book_id: book?.source_book_id,
  })

  if (job.status === 'complete') {
    return NextResponse.json({
      message: 'Job already complete',
      job,
      book,
    })
  }

  if (job.status === 'failed') {
    // Reset the job to allow retry
    await supabase
      .from('vibe_jobs')
      .update({ status: 'running', error: null })
      .eq('id', jobId)

    console.log(`[Kick] Reset failed job ${jobId} to running`)
  }

  // Call the tick endpoint
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const tickUrl = `${baseUrl}/api/create/job/${jobId}/tick`

  console.log(`[Kick] Calling tick at ${tickUrl}`)

  try {
    const tickResponse = await fetch(tickUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': process.env.CRON_SECRET || '',
        'x-auto-resume': 'true',
        'x-user-id': job.user_id
      }
    })

    const tickResult = await tickResponse.json()

    console.log(`[Kick] Tick response:`, tickResponse.status, tickResult)

    return NextResponse.json({
      message: tickResponse.ok ? 'Job kicked successfully' : 'Tick failed',
      tickStatus: tickResponse.status,
      tickResult,
      job: {
        id: job.id,
        status: job.status,
        step: job.step,
        progress: job.progress,
      },
      book: {
        id: book?.id,
        title: book?.title,
        source_book_id: book?.source_book_id,
      }
    })
  } catch (error) {
    console.error(`[Kick] Error calling tick:`, error)
    return NextResponse.json({
      error: 'Failed to call tick',
      details: error instanceof Error ? error.message : 'Unknown error',
      job,
      book,
    }, { status: 500 })
  }
}

/**
 * GET /api/create/job/[jobId]/kick
 *
 * Get job status without kicking it.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

  const supabase = createServiceClient()

  const { data: job, error: jobError } = await supabase
    .from('vibe_jobs')
    .select('*, books!vibe_jobs_book_id_fkey(id, title, source_book_id, status)')
    .eq('id', jobId)
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  return NextResponse.json({
    job: {
      id: job.id,
      user_id: job.user_id,
      book_id: job.book_id,
      status: job.status,
      step: job.step,
      progress: job.progress,
      error: job.error,
      created_at: job.created_at,
      updated_at: job.updated_at,
      auto_resume_attempts: job.auto_resume_attempts,
      source_book_id: job.source_book_id,
    },
    book: job.books,
  })
}
