import { getUser, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { BOOK_VOICES } from '@/lib/elevenlabs/client'
import { logger } from '@/lib/logger'

const validVoiceIds = BOOK_VOICES.map(v => v.id)

export async function POST(request: NextRequest) {
  try {
    const { user } = await getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { voice_id } = body

    // Validate voice_id
    if (voice_id && !validVoiceIds.includes(voice_id)) {
      return NextResponse.json({ error: 'Invalid voice ID' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Upsert user preferences
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        voice_id: voice_id,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })

    if (error) {
      logger.error('[Preferences] Error saving:', error)
      return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[Preferences] Error:', error)
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { user } = await getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('user_preferences')
      .select('voice_id')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      logger.error('[Preferences] Error fetching:', error)
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
    }

    return NextResponse.json({ preferences: data || null })
  } catch (error) {
    logger.error('[Preferences] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
  }
}
