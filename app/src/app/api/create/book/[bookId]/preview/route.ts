import { createServiceClient, getUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { Book, VibeJob, Chapter, VibePreview, Constitution, StorySliders, DEFAULT_SLIDERS } from '@/types/chronicle'

interface RouteParams {
  params: Promise<{ bookId: string }>
}

/**
 * GET /api/create/book/[bookId]/preview
 *
 * Fetches the source book's preview data for regeneration.
 * Returns preview, constitution, sliders, chapters, genre, and prompt.
 * Only the owner can access this endpoint.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { bookId } = await params
  const { user } = await getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Fetch the book
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .single()

  if (bookError || !book) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 })
  }

  const typedBook = book as Book

  // Verify ownership
  if (typedBook.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Note: Allow access to non-final books for editing purposes
  // Only block if book status indicates active generation

  // Fetch the associated vibe_job to get the original preview data
  const { data: vibeJob, error: jobError } = await supabase
    .from('vibe_jobs')
    .select('*')
    .eq('book_id', bookId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (jobError || !vibeJob) {
    // Book might have been created via author mode, not vibe
    // In this case, construct preview from book data
    const fallbackPreview: VibePreview = {
      title: typedBook.title,
      logline: typedBook.core_question || '',
      blurb: '',
      cast: [],
      setting: '',
      promise: [],
      warnings: { violence: 'none', romance: 'none' },
      sliders: DEFAULT_SLIDERS,
    }

    return NextResponse.json({
      preview: fallbackPreview,
      constitution: typedBook.constitution_json,
      sliders: DEFAULT_SLIDERS,
      chapters: [],
      genre: typedBook.genre,
      prompt: typedBook.core_question || typedBook.title,
    })
  }

  const typedJob = vibeJob as VibeJob

  // Fetch chapters for the chapter dropdown
  const { data: chapters, error: chaptersError } = await supabase
    .from('chapters')
    .select('index, title')
    .eq('book_id', bookId)
    .order('index', { ascending: true })

  if (chaptersError) {
    console.error('[Preview] Failed to fetch chapters:', chaptersError)
  }

  const typedChapters = (chapters || []) as Pick<Chapter, 'index' | 'title'>[]

  // Extract preview data from job
  const preview = typedJob.preview as VibePreview & { targetPages?: number; mode?: string; sliders?: StorySliders }
  const sliders = preview.sliders || DEFAULT_SLIDERS

  return NextResponse.json({
    preview: {
      title: preview.title,
      logline: preview.logline,
      blurb: preview.blurb,
      cast: preview.cast,
      setting: preview.setting,
      promise: preview.promise,
      warnings: preview.warnings,
    } as VibePreview,
    constitution: typedBook.constitution_json as Constitution,
    sliders: sliders,
    chapters: typedChapters,
    genre: typedJob.genre,
    prompt: typedJob.user_prompt,
    targetPages: preview.targetPages || 30,
    mode: preview.mode || 'draft',
  })
}
