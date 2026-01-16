import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { VibePreview, VibeJob, Book } from '@/types/chronicle'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/books/[id]/backcover
 *
 * Updates the backcover data (vibe_jobs.preview) for a book.
 * Also updates books.title if the title has changed.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify ownership
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (bookError || !book) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 })
  }

  const typedBook = book as Book

  // Parse the request body
  let preview: VibePreview
  try {
    preview = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate required fields
  if (!preview.title || typeof preview.title !== 'string') {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  // Use service client to update vibe_jobs (may not have RLS policy for user updates)
  const serviceClient = createServiceClient()

  // Find the most recent vibe_job for this book
  const { data: vibeJob, error: jobError } = await serviceClient
    .from('vibe_jobs')
    .select('*')
    .eq('book_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (jobError || !vibeJob) {
    return NextResponse.json({ error: 'No vibe job found for this book' }, { status: 404 })
  }

  const typedJob = vibeJob as VibeJob

  // Merge the new preview data with existing job preview (preserve non-editable fields)
  const existingPreview = typedJob.preview as VibePreview & { targetPages?: number; mode?: string; sliders?: unknown }
  const updatedPreview = {
    ...existingPreview,
    title: preview.title,
    logline: preview.logline || '',
    blurb: preview.blurb || '',
    cast: preview.cast || [],
    setting: preview.setting || '',
    promise: preview.promise || [],
  }

  // Update the vibe_job preview
  const { error: updateJobError } = await serviceClient
    .from('vibe_jobs')
    .update({ preview: updatedPreview })
    .eq('id', typedJob.id)

  if (updateJobError) {
    console.error('[Backcover] Failed to update vibe_job:', updateJobError)
    return NextResponse.json({ error: 'Failed to update backcover' }, { status: 500 })
  }

  // If title changed, also update the book title
  if (preview.title !== typedBook.title) {
    const { error: updateBookError } = await supabase
      .from('books')
      .update({ title: preview.title })
      .eq('id', id)

    if (updateBookError) {
      console.error('[Backcover] Failed to update book title:', updateBookError)
      // Don't fail the request, the preview was updated successfully
    }
  }

  return NextResponse.json({ success: true })
}
