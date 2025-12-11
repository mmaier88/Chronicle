import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/agents/executions - List agent executions
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
    const agentId = searchParams.get('agent_id')
    const pipelineId = searchParams.get('pipeline_id')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
    }

    let query = supabase
      .from('agent_executions')
      .select(`
        *,
        agent:agent_definitions (id, name, agent_type),
        pipeline:agent_pipelines (id, name)
      `)
      .eq('workspace_id', workspaceId)

    if (agentId) {
      query = query.eq('agent_id', agentId)
    }

    if (pipelineId) {
      query = query.eq('pipeline_id', pipelineId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: executions, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ executions })
  } catch (error) {
    console.error('List executions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
