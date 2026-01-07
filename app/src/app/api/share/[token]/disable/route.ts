import { NextResponse } from 'next/server'
import { createServiceClient, getUser } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { user } = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { token } = await params

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get share with book info to verify ownership
    const { data: share, error: shareError } = await supabase
      .from('book_shares')
      .select('id, book_id, books!inner(owner_id)')
      .eq('share_token', token)
      .single()

    if (shareError || !share) {
      return NextResponse.json(
        { error: 'Share link not found' },
        { status: 404 }
      )
    }

    // Verify ownership - books is a single object with !inner join
    const books = share.books as unknown as { owner_id: string }
    if (books?.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Disable the share
    const { error: updateError } = await supabase
      .from('book_shares')
      .update({ enabled: false })
      .eq('id', share.id)

    if (updateError) {
      console.error('Failed to disable share:', updateError)
      return NextResponse.json(
        { error: 'Failed to disable share link' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Share disable error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
