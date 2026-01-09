/**
 * Audio Progress API
 *
 * GET - Load audio playback progress for a book
 * POST - Save audio playback progress
 */

import { NextRequest } from 'next/server'
import { getUser, createServiceClient } from '@/lib/supabase/server'
import { success, apiError } from '@/lib/api-response'
import { logger } from '@/lib/logger'

// GET /api/reader/audio-progress?bookId=xxx
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

  // Get audio progress
  const { data: progress, error } = await supabase
    .from('audio_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('book_id', bookId)
    .single()

  if (error && error.code !== 'PGRST116') {
    logger.error('Failed to load audio progress', error, { userId: user.id, bookId })
    return apiError.internal('Failed to load audio progress')
  }

  return success({
    progress: progress || null,
  })
}

// POST /api/reader/audio-progress
export async function POST(request: NextRequest) {
  const { user } = await getUser()
  if (!user) {
    return apiError.unauthorized()
  }

  let body: {
    bookId: string
    paragraphId: string
    audioOffsetMs?: number
    playbackSpeed?: number
  }

  try {
    body = await request.json()
  } catch {
    return apiError.badRequest('Invalid request body')
  }

  const { bookId, paragraphId, audioOffsetMs = 0, playbackSpeed = 1.0 } = body

  if (!bookId || !paragraphId) {
    return apiError.badRequest('bookId and paragraphId are required')
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

  // Upsert audio progress using the helper function
  const { data: progress, error } = await supabase.rpc('upsert_audio_progress', {
    p_user_id: user.id,
    p_book_id: bookId,
    p_paragraph_id: paragraphId,
    p_audio_offset_ms: audioOffsetMs,
    p_playback_speed: playbackSpeed,
  })

  if (error) {
    logger.error('Failed to save audio progress', error, { userId: user.id, bookId })
    return apiError.internal('Failed to save audio progress')
  }

  return success({
    progress,
    saved: true,
  })
}
