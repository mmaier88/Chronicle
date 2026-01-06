import { createClient, getUser, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const { user, isDevUser } = await getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = isDevUser ? createServiceClient() : await createClient()

  const { data: job, error } = await supabase
    .from('vibe_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single()

  if (error || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: job.id,
    book_id: job.book_id,
    status: job.status,
    step: job.step,
    progress: job.progress,
    error: job.error,
    attempt: job.attempt,
    created_at: job.created_at,
    started_at: job.started_at,
    completed_at: job.completed_at,
  })
}
