import { createClient, getUser, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { VibePreview, BookGenre, Constitution, StorySliders, DEFAULT_SLIDERS, SliderValue } from '@/types/chronicle'
import { logger } from '@/lib/logger'

type BookLength = 30 | 60 | 120 | 300
type GenerationMode = 'draft' | 'polished'

// Convert slider value to warning level for display
function sliderToWarning(value: SliderValue): 'none' | 'low' | 'medium' | 'high' {
  if (value === 'auto') return 'low' // Default for auto
  if (value <= 1) return 'none'
  if (value <= 2) return 'low'
  if (value <= 3) return 'medium'
  return 'high'
}

interface CreateJobRequest {
  genre: BookGenre
  prompt: string
  preview: VibePreview
  length?: BookLength
  mode?: GenerationMode
  sliders?: StorySliders
  // Regeneration fields
  sourceBookId?: string
  sourceChapterIndex?: number | null  // null = full regen, 0+ = from chapter N
  constitution?: Constitution
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
  const { genre, prompt, preview, length = 30, mode = 'draft', sliders, sourceBookId, sourceChapterIndex, constitution } = body

  // Include length, mode, and sliders in preview for tick route to access
  const userSliders = sliders || DEFAULT_SLIDERS

  // Override preview warnings based on user's slider choices
  // This ensures the displayed warnings match what the user actually requested
  const warningsFromSliders = {
    violence: sliderToWarning(userSliders.violence),
    romance: sliderToWarning(userSliders.romance),
  }

  const previewWithMeta = {
    ...preview,
    targetPages: length,
    mode,
    sliders: userSliders,
    warnings: warningsFromSliders, // Override AI-inferred warnings with user's explicit choices
  }

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

  // For regeneration: verify source book ownership and check for active generation
  if (sourceBookId) {
    const { data: sourceBook, error: sourceError } = await supabase
      .from('books')
      .select('owner_id, status')
      .eq('id', sourceBookId)
      .single()

    if (sourceError || !sourceBook) {
      return NextResponse.json({ error: 'Source book not found' }, { status: 404 })
    }

    if (sourceBook.owner_id !== user.id) {
      return NextResponse.json({ error: 'Cannot regenerate a book you do not own' }, { status: 403 })
    }

    // Check if there's an active job generating this book
    const { data: activeJob } = await supabase
      .from('vibe_jobs')
      .select('id, status')
      .eq('book_id', sourceBookId)
      .in('status', ['queued', 'running'])
      .limit(1)
      .single()

    if (activeJob) {
      return NextResponse.json({ error: 'Cannot regenerate a book that is currently being generated' }, { status: 400 })
    }
  }

  // Use provided constitution (for regeneration) or create empty shell
  const bookConstitution: Constitution = constitution || {
    central_thesis: null,
    worldview_frame: null,
    narrative_voice: null,
    what_book_is_against: null,
    what_book_refuses_to_do: null,
    ideal_reader: null,
    taboo_simplifications: null,
  }

  // For regeneration with constitution: lock it immediately if all fields are filled
  const isConstitutionComplete = constitution &&
    constitution.central_thesis &&
    constitution.worldview_frame &&
    constitution.narrative_voice

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
      constitution_json: bookConstitution,
      constitution_locked: isConstitutionComplete,
      // Regeneration lineage
      source_book_id: sourceBookId || null,
      source_chapter_index: sourceChapterIndex ?? null,
    })
    .select()
    .single()

  if (bookError || !book) {
    logger.error('Failed to create book', bookError, { userId: user.id, operation: 'create_book' })
    return NextResponse.json({
      error: 'Failed to create book',
      details: bookError?.message || 'Unknown error'
    }, { status: 500 })
  }

  // For partial regeneration: copy chapters before sourceChapterIndex
  let startStep = 'created'
  if (sourceBookId && typeof sourceChapterIndex === 'number' && sourceChapterIndex > 0) {
    // Fetch chapters to copy from source book
    const { data: sourceChapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('*')
      .eq('book_id', sourceBookId)
      .lt('index', sourceChapterIndex)
      .order('index', { ascending: true })

    if (chaptersError) {
      logger.error('Failed to fetch source chapters for regeneration', chaptersError, { sourceBookId })
      // Continue without copying - will regenerate from start
    } else if (sourceChapters && sourceChapters.length > 0) {
      // Copy each chapter and its sections
      for (const sourceChapter of sourceChapters) {
        // Create chapter in new book
        const { data: newChapter, error: chapterError } = await supabase
          .from('chapters')
          .insert({
            book_id: book.id,
            index: sourceChapter.index,
            title: sourceChapter.title,
            purpose: sourceChapter.purpose,
            central_claim: sourceChapter.central_claim,
            emotional_arc: sourceChapter.emotional_arc,
            failure_mode: sourceChapter.failure_mode,
            dependencies: sourceChapter.dependencies,
            motifs: sourceChapter.motifs,
            status: 'canonical', // Copied chapters are canonical
          })
          .select()
          .single()

        if (chapterError || !newChapter) {
          logger.error('Failed to copy chapter during regeneration', chapterError, { sourceChapterId: sourceChapter.id })
          continue
        }

        // Fetch and copy sections for this chapter
        const { data: sourceSections, error: sectionsError } = await supabase
          .from('sections')
          .select('*')
          .eq('chapter_id', sourceChapter.id)
          .order('index', { ascending: true })

        if (sectionsError || !sourceSections) {
          logger.error('Failed to fetch source sections for regeneration', sectionsError, { sourceChapterId: sourceChapter.id })
          continue
        }

        for (const sourceSection of sourceSections) {
          const { error: sectionError } = await supabase
            .from('sections')
            .insert({
              chapter_id: newChapter.id,
              index: sourceSection.index,
              title: sourceSection.title,
              goal: sourceSection.goal,
              local_claim: sourceSection.local_claim,
              constraints: sourceSection.constraints,
              content_json: sourceSection.content_json,
              content_text: sourceSection.content_text,
              status: 'canonical', // Copied sections are canonical
            })

          if (sectionError) {
            logger.error('Failed to copy section during regeneration', sectionError, { sourceSectionId: sourceSection.id })
          }
        }
      }

      // Set start step to skip plan and constitution, start writing at the specified chapter
      startStep = `write_ch${sourceChapterIndex}_s0`
      logger.info(`Partial regeneration: copied ${sourceChapters.length} chapters, starting at step ${startStep}`, {
        sourceBookId,
        newBookId: book.id,
        sourceChapterIndex,
      })
    }
  }

  // Create vibe job
  const { data: job, error: jobError } = await supabase
    .from('vibe_jobs')
    .insert({
      user_id: user.id,
      book_id: book.id,
      genre: genre,
      user_prompt: prompt,
      preview: previewWithMeta,
      status: 'queued',
      step: startStep,
      progress: sourceChapterIndex && sourceChapterIndex > 0 ? 15 : 0, // Partial regen starts with some progress
      // Regeneration context
      source_book_id: sourceBookId || null,
      source_chapter_index: sourceChapterIndex ?? null,
    })
    .select()
    .single()

  if (jobError || !job) {
    logger.error('Failed to create vibe job', jobError, { userId: user.id, bookId: book.id, operation: 'create_vibe_job' })
    // Clean up book if job creation fails
    const { error: deleteError } = await supabase.from('books').delete().eq('id', book.id)
    if (deleteError) {
      logger.error('Failed to clean up book after job creation failure', deleteError, { bookId: book.id })
    }
    return NextResponse.json({ error: 'Failed to create generation job' }, { status: 500 })
  }

  return NextResponse.json({
    job_id: job.id,
    book_id: book.id,
    status: 'queued',
    isRegeneration: !!sourceBookId,
    message: 'Job created. Call /api/create/job/[jobId]/tick to start generation.'
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
