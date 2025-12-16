import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/workspaces/[id]/activity - Get workspace activity feed
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify workspace access
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50') || 50))
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0') || 0)
    const targetType = searchParams.get('target_type')

    let query = supabase
      .from('activity_feed')
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (targetType) {
      query = query.eq('target_type', targetType)
    }

    const { data: activities, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      activities,
      total: count,
      limit,
      offset,
    })

  } catch (error) {
    console.error('Get activity error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/workspaces/[id]/activity - Record activity
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify workspace access
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const { action, target_type, target_id, target_title, details } = body

    if (!action || !target_type) {
      return NextResponse.json({ error: 'action and target_type required' }, { status: 400 })
    }

    const { data: activity, error } = await supabase
      .from('activity_feed')
      .insert({
        workspace_id: workspaceId,
        user_id: user.id,
        action,
        target_type,
        target_id,
        target_title,
        details: details || {},
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ activity }, { status: 201 })

  } catch (error) {
    console.error('Record activity error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
