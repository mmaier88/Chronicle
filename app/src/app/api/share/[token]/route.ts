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

    // First check if share exists and is enabled
    const { data: share, error: shareError } = await supabase
      .from('book_shares')
      .select('id, enabled')
      .eq('share_token', token)
      .single()

    if (shareError || !share) {
      console.error('[Share] Share not found:', token, shareError?.message)
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

    // Track share view analytics (fire and forget)
    void supabase.from('share_analytics').insert({
      share_id: share.id,
      event_type: 'view',
      user_agent: request.headers.get('user-agent')?.slice(0, 255) || null,
      referrer: request.headers.get('referer')?.slice(0, 255) || null,
    })  // Ignore errors - analytics shouldn't block response

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
