import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const VELT_API_KEY = process.env.NEXT_PUBLIC_VELT_API_KEY!
const VELT_AUTH_TOKEN = process.env.VELT_AUTH_TOKEN!

/**
 * POST /api/velt/token - Generate a Velt JWT token for the authenticated user
 */
export async function POST() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile for display name
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()

    // Generate Velt token
    const response = await fetch('https://api.velt.dev/v2/auth/generate_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-velt-api-key': VELT_API_KEY,
        'x-velt-auth-token': VELT_AUTH_TOKEN,
      },
      body: JSON.stringify({
        data: {
          userId: user.id,
          userProperties: {
            organizationId: 'researchbase', // Single org for now
            email: user.email,
            name: profile?.display_name || user.email?.split('@')[0] || 'User',
          },
        },
      }),
    })

    const data = await response.json()

    if (!response.ok || !data?.result?.data?.token) {
      console.error('Velt token generation failed:', data)
      return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
    }

    return NextResponse.json({
      token: data.result.data.token,
      user: {
        userId: user.id,
        organizationId: 'researchbase',
        name: profile?.display_name || user.email?.split('@')[0] || 'User',
        email: user.email || '',
        photoUrl: user.user_metadata?.avatar_url,
      }
    })

  } catch (error) {
    console.error('Velt token error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
