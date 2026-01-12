import { getUser, createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { user } = await getUser()

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    // Get user preferences from database
    const supabase = await createClient()
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('voice_id')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      preferences: preferences || null,
    })
  } catch (error) {
    console.error('[Auth] Error fetching user:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}
