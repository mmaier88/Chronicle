import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/notifications/preferences - Get user's notification preferences
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace_id')

    let query = supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId)
    }

    const { data: preferences, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Return default preferences if none exist
    if (!preferences || preferences.length === 0) {
      return NextResponse.json({
        preferences: [{
          user_id: user.id,
          workspace_id: workspaceId,
          email_weekly_summary: true,
          email_contradictions: true,
          email_mentions: true,
          email_document_changes: false,
          inapp_contradictions: true,
          inapp_mentions: true,
          inapp_document_changes: true,
          digest_day: 'monday',
          digest_time: '09:00',
        }],
        is_default: true,
      })
    }

    return NextResponse.json({ preferences, is_default: false })

  } catch (error) {
    console.error('Get preferences error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/notifications/preferences - Update notification preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      workspace_id,
      email_weekly_summary,
      email_contradictions,
      email_mentions,
      email_document_changes,
      inapp_contradictions,
      inapp_mentions,
      inapp_document_changes,
      digest_day,
      digest_time,
    } = body

    const updates: Record<string, unknown> = {}
    if (email_weekly_summary !== undefined) updates.email_weekly_summary = email_weekly_summary
    if (email_contradictions !== undefined) updates.email_contradictions = email_contradictions
    if (email_mentions !== undefined) updates.email_mentions = email_mentions
    if (email_document_changes !== undefined) updates.email_document_changes = email_document_changes
    if (inapp_contradictions !== undefined) updates.inapp_contradictions = inapp_contradictions
    if (inapp_mentions !== undefined) updates.inapp_mentions = inapp_mentions
    if (inapp_document_changes !== undefined) updates.inapp_document_changes = inapp_document_changes
    if (digest_day !== undefined) updates.digest_day = digest_day
    if (digest_time !== undefined) updates.digest_time = digest_time

    // Upsert preferences
    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: user.id,
        workspace_id: workspace_id || null,
        ...updates,
      }, {
        onConflict: 'user_id,workspace_id',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ preferences })

  } catch (error) {
    console.error('Update preferences error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
