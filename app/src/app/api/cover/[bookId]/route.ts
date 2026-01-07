import { NextResponse } from 'next/server'
import { createServiceClient, getUser } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params
    const { user } = await getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    const { data: book, error } = await supabase
      .from('books')
      .select('id, owner_id, cover_url, cover_status, cover_generated_at')
      .eq('id', bookId)
      .single()

    if (error || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // Verify ownership
    if (book.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({
      status: book.cover_status || 'pending',
      cover_url: book.cover_url,
      generated_at: book.cover_generated_at,
    })
  } catch (error) {
    console.error('Cover status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
