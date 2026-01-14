import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export interface StaffPick {
  id: string
  title: string
  core_question: string | null
  cover_url: string | null
  genre: string
  share_token: string
  created_at: string
}

/**
 * Get staff-picked books for public display
 * No authentication required
 */
export async function GET() {
  try {
    // Create client directly with service role to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      console.error('[Staff Picks] Missing Supabase config')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    // Direct query with inner join to book_shares to get real share tokens
    // This ensures we only return staff picks that have valid share links
    const { data, error } = await supabase
      .from('books')
      .select(`
        id,
        title,
        core_question,
        cover_url,
        genre,
        created_at,
        book_shares!inner(share_token)
      `)
      .eq('is_staff_pick', true)
      .eq('status', 'final')
      .not('cover_url', 'is', null)
      .order('staff_pick_order', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(6)

    if (error) {
      console.error('[Staff Picks] Database error:', error.message, error.details, error.hint)
      return NextResponse.json({ error: 'Failed to load staff picks', details: error.message }, { status: 500 })
    }

    // Transform to expected format - extract share_token from nested object
    const staffPicks: StaffPick[] = (data || []).map((pick: {
      id: string
      title: string
      core_question: string | null
      cover_url: string | null
      genre: string
      created_at: string
      book_shares: { share_token: string }[]
    }) => ({
      id: pick.id,
      title: pick.title,
      core_question: pick.core_question,
      cover_url: pick.cover_url,
      genre: pick.genre,
      share_token: pick.book_shares[0]?.share_token,
      created_at: pick.created_at
    }))

    return NextResponse.json({ staffPicks })
  } catch (error) {
    console.error('[Staff Picks] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
