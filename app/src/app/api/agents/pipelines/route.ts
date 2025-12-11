import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/agents/pipelines - List agent pipelines
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

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
    }

    const { data: pipelines, error } = await supabase
      .from('agent_pipelines')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ pipelines })
  } catch (error) {
    console.error('List pipelines error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/agents/pipelines - Create an agent pipeline
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      workspace_id,
      name,
      description,
      steps,
      parallel_groups,
      trigger_type,
      trigger_config
    } = body

    if (!workspace_id || !name || !steps) {
      return NextResponse.json({ error: 'workspace_id, name, and steps required' }, { status: 400 })
    }

    // Validate steps structure
    if (!Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json({ error: 'steps must be a non-empty array' }, { status: 400 })
    }

    const { data: pipeline, error } = await supabase
      .from('agent_pipelines')
      .insert({
        workspace_id,
        name,
        description,
        steps,
        parallel_groups: parallel_groups || [],
        trigger_type: trigger_type || 'manual',
        trigger_config: trigger_config || {},
        is_active: true,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ pipeline }, { status: 201 })
  } catch (error) {
    console.error('Create pipeline error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
