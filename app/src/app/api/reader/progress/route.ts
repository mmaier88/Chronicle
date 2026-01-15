/**
 * Reader Progress API
 *
 * GET - Load reading progress for a book
 * POST - Save reading progress (debounced on client)
 */

import { NextRequest } from 'next/server'
import { getUser, createServiceClient } from '@/lib/supabase/server'
import { success, apiError } from '@/lib/api-response'
import { logger } from '@/lib/logger'

// GET /api/reader/progress?bookId=xxx
export async function GET(request: NextRequest) {
  const { user } = await getUser()
  if (!user) {
    return apiError.unauthorized()
  }

  const bookId = request.nextUrl.searchParams.get('bookId')
  if (!bookId) {
    return apiError.badRequest('bookId is required')
  }

  const supabase = createServiceClient()

  // Verify user owns this book
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('id')
    .eq('id', bookId)
    .eq('owner_id', user.id)
    .single()

  if (bookError || !book) {
    return apiError.notFound('Book')
  }

  // Get progress
  const { data: progress, error } = await supabase
    .from('reader_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('book_id', bookId)
    .single()

  if (error && error.code !== 'PGRST116') {
    logger.error('Failed to load reader progress', error, { userId: user.id, bookId })
    return apiError.internal('Failed to load progress')
  }

  return success({
    progress: progress || null,
  })
}

// POST /api/reader/progress
export async function POST(request: NextRequest) {
  const { user } = await getUser()
  if (!user) {
    return apiError.unauthorized()
  }

  let body: {
    bookId: string
    chapterId: string
    paragraphId: string
    scrollOffset?: number
    scrollOffsetRatio?: number
    // Text-quote anchor fields
    anchorPrefix?: string
    anchorExact?: string
    anchorSuffix?: string
    anchorCharOffset?: number
  }

  try {
    body = await request.json()
  } catch {
    return apiError.badRequest('Invalid request body')
  }

  const {
    bookId,
    chapterId,
    paragraphId,
    scrollOffset = 0,
    scrollOffsetRatio = 0,
    anchorPrefix,
    anchorExact,
    anchorSuffix,
    anchorCharOffset,
  } = body

  if (!bookId || !chapterId || !paragraphId) {
    return apiError.badRequest('bookId, chapterId, and paragraphId are required')
  }

  const supabase = createServiceClient()

  // Verify user owns this book
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('id')
    .eq('id', bookId)
    .eq('owner_id', user.id)
    .single()

  if (bookError || !book) {
    return apiError.notFound('Book')
  }

  // Upsert progress using the helper function
  const { data: progress, error } = await supabase.rpc('upsert_reader_progress', {
    p_user_id: user.id,
    p_book_id: bookId,
    p_chapter_id: chapterId,
    p_paragraph_id: paragraphId,
    p_scroll_offset: scrollOffset,
    p_scroll_offset_ratio: scrollOffsetRatio,
    p_anchor_prefix: anchorPrefix || null,
    p_anchor_exact: anchorExact || null,
    p_anchor_suffix: anchorSuffix || null,
    p_anchor_char_offset: anchorCharOffset || null,
  })

  if (error) {
    logger.error('Failed to save reader progress', error, { userId: user.id, bookId })
    return apiError.internal('Failed to save progress')
  }

  return success({
    progress,
    saved: true,
  })
}
