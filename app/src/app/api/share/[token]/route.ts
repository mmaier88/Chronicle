import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // First check if share exists and is not expired
    const { data: share, error: shareError } = await supabase
      .from('book_shares')
      .select('id, enabled, expires_at')
      .eq('share_token', token)
      .single()

    if (shareError || !share) {
      return NextResponse.json(
        { error: 'Share link not found' },
        { status: 404 }
      )
    }

    if (!share.enabled) {
      return NextResponse.json(
        { error: 'Share link has been disabled' },
        { status: 403 }
      )
    }

    // Check expiration
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Share link has expired' },
        { status: 410 }
      )
    }

    // Get shared book using RLS bypass function
    const { data: books, error: bookError } = await supabase.rpc(
      'get_shared_book',
      { token }
    )

    if (bookError || !books || books.length === 0) {
      return NextResponse.json(
        { error: 'Share link not found or disabled' },
        { status: 404 }
      )
    }

    const book = books[0]

    // Get chapters
    const { data: chapters, error: chaptersError } = await supabase.rpc(
      'get_shared_chapters',
      { token }
    )

    if (chaptersError) {
      console.error('Failed to get chapters:', chaptersError)
      return NextResponse.json(
        { error: 'Failed to load book content' },
        { status: 500 }
      )
    }

    // Get sections
    const { data: sections, error: sectionsError } = await supabase.rpc(
      'get_shared_sections',
      { token }
    )

    if (sectionsError) {
      console.error('Failed to get sections:', sectionsError)
      return NextResponse.json(
        { error: 'Failed to load book content' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      book,
      chapters: chapters || [],
      sections: sections || [],
    })
  } catch (error) {
    console.error('Share fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
