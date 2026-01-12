import { createServiceClient, getUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ bookId: string }>
}

/**
 * DELETE /api/create/book/[bookId]
 *
 * Deletes a book and its associated vibe_job.
 * Only the owner can delete their book.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { bookId } = await params
  const { user } = await getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Verify ownership
  const { data: book, error: fetchError } = await supabase
    .from('books')
    .select('id, owner_id')
    .eq('id', bookId)
    .single()

  if (fetchError || !book) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 })
  }

  if (book.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Delete the book (cascade will delete vibe_jobs, chapters, sections)
  const { error: deleteError } = await supabase
    .from('books')
    .delete()
    .eq('id', bookId)

  if (deleteError) {
    console.error('[Book Delete] Error:', deleteError)
    return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 })
  }

  console.log(`[Book Delete] Deleted book ${bookId} for user ${user.id}`)

  return NextResponse.json({ success: true })
}
