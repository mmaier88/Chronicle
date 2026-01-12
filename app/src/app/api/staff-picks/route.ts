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

    // Use the database function that bypasses RLS
    const { data, error } = await supabase.rpc('get_staff_picks', {
      pick_limit: 6
    })

    if (error) {
      console.error('[Staff Picks] Database error:', error.message, error.details, error.hint)
      return NextResponse.json({ error: 'Failed to load staff picks', details: error.message }, { status: 500 })
    }

    const staffPicks: StaffPick[] = (data || []).map((pick: StaffPick) => ({
      id: pick.id,
      title: pick.title,
      core_question: pick.core_question,
      cover_url: pick.cover_url,
      genre: pick.genre,
      share_token: pick.share_token,
      created_at: pick.created_at
    }))

    return NextResponse.json({ staffPicks })
  } catch (error) {
    console.error('[Staff Picks] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
