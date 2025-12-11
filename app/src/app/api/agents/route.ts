import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/agents - List agent definitions
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
    const agentType = searchParams.get('type')
    const includeDefaults = searchParams.get('include_defaults') !== 'false'

    let query = supabase
      .from('agent_definitions')
      .select('*')

    if (workspaceId) {
      if (includeDefaults) {
        query = query.or(`workspace_id.eq.${workspaceId},is_default.eq.true`)
      } else {
        query = query.eq('workspace_id', workspaceId)
      }
    } else if (includeDefaults) {
      query = query.eq('is_default', true)
    }

    if (agentType) {
      query = query.eq('agent_type', agentType)
    }

    const { data: agents, error } = await query.order('is_default', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ agents })
  } catch (error) {
    console.error('List agents error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/agents - Create a custom agent
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
      agent_type,
      description,
      system_prompt,
      model,
      temperature,
      max_tokens,
      can_search_sources,
      can_search_entities,
      can_create_entities,
      can_modify_document
    } = body

    if (!workspace_id || !name || !agent_type || !system_prompt) {
      return NextResponse.json({
        error: 'workspace_id, name, agent_type, and system_prompt required'
      }, { status: 400 })
    }

    const { data: agent, error } = await supabase
      .from('agent_definitions')
      .insert({
        workspace_id,
        name,
        agent_type,
        description,
        system_prompt,
        model: model || 'claude-sonnet-4-20250514',
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens || 2000,
        can_search_sources: can_search_sources || false,
        can_search_entities: can_search_entities || false,
        can_create_entities: can_create_entities || false,
        can_modify_document: can_modify_document || false,
        is_default: false,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ agent }, { status: 201 })
  } catch (error) {
    console.error('Create agent error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
