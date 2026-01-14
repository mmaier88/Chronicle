import { createServiceClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import { NextResponse } from 'next/server'

/**
 * Admin endpoint to create missing share links for staff picks
 * Run this once to fix staff picks that don't have share tokens
 */
export async function POST(request: Request) {
  // Simple admin auth via header
  const authHeader = request.headers.get('x-admin-key')
  if (authHeader !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Get all staff pick books
  const { data: staffPicks, error: fetchError } = await supabase
    .from('books')
    .select('id, title')
    .eq('is_staff_pick', true)
    .eq('status', 'final')

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const results = []

  for (const book of staffPicks || []) {
    // Check if share already exists
    const { data: existingShare } = await supabase
      .from('book_shares')
      .select('id, share_token')
      .eq('book_id', book.id)
      .eq('enabled', true)
      .single()

    if (existingShare) {
      results.push({
        book_id: book.id,
        title: book.title,
        status: 'existing',
        share_token: existingShare.share_token,
      })
      continue
    }

    // Create new share link
    const shareToken = crypto.randomBytes(16).toString('hex')

    // Create share record
    const { data: newShare, error: createError } = await supabase
      .from('book_shares')
      .insert({
        book_id: book.id,
        share_token: shareToken,
        enabled: true,
        view_count: 0,
      })
      .select('id, share_token')
      .single()

    if (createError) {
      results.push({
        book_id: book.id,
        title: book.title,
        status: 'error',
        error: createError.message,
      })
    } else {
      results.push({
        book_id: book.id,
        title: book.title,
        status: 'created',
        share_token: newShare.share_token,
      })
    }
  }

  return NextResponse.json({
    message: 'Staff picks processed',
    results,
  })
}
