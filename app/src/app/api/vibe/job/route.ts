import { createClient, getUser, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { VibePreview, BookGenre, Constitution } from '@/types/chronicle'

type BookLength = 30 | 60 | 120 | 300

interface CreateJobRequest {
  genre: BookGenre
  prompt: string
  preview: VibePreview
  length?: BookLength
}

// Rate limit: max jobs per user per day
const MAX_JOBS_PER_DAY = 5

export async function POST(request: NextRequest) {
  const { user, isDevUser } = await getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service client for dev users to bypass RLS
  const supabase = isDevUser ? createServiceClient() : await createClient()

  const body: CreateJobRequest = await request.json()
  const { genre, prompt, preview, length = 30 } = body

  // Include length in preview for tick route to access
  const previewWithLength = { ...preview, targetPages: length }

  if (!genre || !prompt || !preview) {
    return NextResponse.json({ error: 'Genre, prompt, and preview are required' }, { status: 400 })
  }

  // Rate limiting check
  const { data: jobCount } = await supabase.rpc('get_user_vibe_job_count_today', {
    user_uuid: user.id
  })

  if (jobCount && jobCount >= MAX_JOBS_PER_DAY) {
    return NextResponse.json({
      error: `You've reached the daily limit of ${MAX_JOBS_PER_DAY} book generations. Please try again tomorrow.`,
      rateLimited: true
    }, { status: 429 })
  }

  // Create empty constitution shell (will be auto-generated during tick)
  const emptyConstitution: Constitution = {
    central_thesis: null,
    worldview_frame: null,
    narrative_voice: null,
    what_book_is_against: null,
    what_book_refuses_to_do: null,
    ideal_reader: null,
    taboo_simplifications: null,
  }

  // Create book shell
  const { data: book, error: bookError } = await supabase
    .from('books')
    .insert({
      owner_id: user.id,
      title: preview.title,
      genre: genre,
      source: 'vibe',
      core_question: preview.logline,
      status: 'drafting',
      constitution_json: emptyConstitution,
      constitution_locked: false,
    })
    .select()
    .single()

  if (bookError || !book) {
    console.error('Failed to create book:', bookError)
    return NextResponse.json({ error: 'Failed to create book' }, { status: 500 })
  }

  // Create vibe job
  const { data: job, error: jobError } = await supabase
    .from('vibe_jobs')
    .insert({
      user_id: user.id,
      book_id: book.id,
      genre: genre,
      user_prompt: prompt,
      preview: previewWithLength,
      status: 'queued',
      step: 'created',
      progress: 0,
    })
    .select()
    .single()

  if (jobError || !job) {
    console.error('Failed to create vibe job:', jobError)
    // Clean up book if job creation fails
    await supabase.from('books').delete().eq('id', book.id)
    return NextResponse.json({ error: 'Failed to create generation job' }, { status: 500 })
  }

  return NextResponse.json({
    job_id: job.id,
    book_id: book.id,
    status: 'queued',
    message: 'Job created. Call /api/vibe/job/[jobId]/tick to start generation.'
  })
}

// GET: List user's vibe jobs
export async function GET() {
  const { user, isDevUser } = await getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = isDevUser ? createServiceClient() : await createClient()

  const { data: jobs, error } = await supabase
    .from('vibe_jobs')
    .select('*, book:books(id, title)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }

  return NextResponse.json({ jobs })
}
