import { NextResponse } from 'next/server'
import { createServiceClient, getUser } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const { user } = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { bookId } = await request.json()

    if (!bookId) {
      return NextResponse.json({ error: 'bookId is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Verify book ownership
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, owner_id, title')
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    if (book.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check for existing active share
    const { data: existingShare } = await supabase
      .from('book_shares')
      .select('id, share_token, view_count, created_at')
      .eq('book_id', bookId)
      .eq('enabled', true)
      .single()

    if (existingShare) {
      // Return existing share link
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      return NextResponse.json({
        shareToken: existingShare.share_token,
        shareUrl: `${baseUrl}/share/${existingShare.share_token}`,
        viewCount: existingShare.view_count,
        createdAt: existingShare.created_at,
        isNew: false,
      })
    }

    // Generate new share token
    const shareToken = crypto.randomBytes(16).toString('hex')

    // Set expiration to 90 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 90)

    // Create share record
    const { data: newShare, error: createError } = await supabase
      .from('book_shares')
      .insert({
        book_id: bookId,
        share_token: shareToken,
        enabled: true,
        view_count: 0,
        expires_at: expiresAt.toISOString(),
      })
      .select('id, share_token, created_at, expires_at')
      .single()

    if (createError) {
      console.error('Failed to create share:', createError)
      return NextResponse.json(
        { error: 'Failed to create share link' },
        { status: 500 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return NextResponse.json({
      shareToken: newShare.share_token,
      shareUrl: `${baseUrl}/share/${newShare.share_token}`,
      viewCount: 0,
      createdAt: newShare.created_at,
      expiresAt: newShare.expires_at,
      isNew: true,
    })
  } catch (error) {
    console.error('Share create error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
