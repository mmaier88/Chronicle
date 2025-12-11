import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

/**
 * GET /api/agents/disagreements - List agent disagreements
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
    const resolved = searchParams.get('resolved')

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
    }

    let query = supabase
      .from('agent_disagreements')
      .select(`
        *,
        agent_a:agent_executions!agent_a_execution_id (
          id,
          agent:agent_definitions (id, name, agent_type)
        ),
        agent_b:agent_executions!agent_b_execution_id (
          id,
          agent:agent_definitions (id, name, agent_type)
        )
      `)
      .eq('workspace_id', workspaceId)

    if (resolved === 'true') {
      query = query.not('resolved_at', 'is', null)
    } else if (resolved === 'false') {
      query = query.is('resolved_at', null)
    }

    const { data: disagreements, error } = await query
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ disagreements })
  } catch (error) {
    console.error('List disagreements error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/agents/disagreements - Create or resolve a disagreement
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
      pipeline_id,
      agent_a_execution_id,
      agent_b_execution_id,
      topic,
      agent_a_position,
      agent_b_position,
      auto_resolve
    } = body

    if (!workspace_id || !agent_a_execution_id || !agent_b_execution_id || !topic) {
      return NextResponse.json({
        error: 'workspace_id, agent_a_execution_id, agent_b_execution_id, and topic required'
      }, { status: 400 })
    }

    // Create the disagreement
    const { data: disagreement, error } = await supabase
      .from('agent_disagreements')
      .insert({
        workspace_id,
        pipeline_id,
        agent_a_execution_id,
        agent_b_execution_id,
        topic,
        agent_a_position,
        agent_b_position
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Auto-resolve using arbitration agent
    if (auto_resolve) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `You are an arbitration agent. Two AI agents have reached different conclusions on a topic. Analyze both positions and provide a resolution.

Topic: ${topic}

Agent A's Position:
${agent_a_position}

Agent B's Position:
${agent_b_position}

Provide a balanced resolution that:
1. Acknowledges the valid points in each position
2. Identifies any errors or weaknesses
3. Synthesizes a final answer or recommendation

Respond with JSON:
{
  "resolution": "Your balanced resolution",
  "agent_a_valid_points": ["List valid points from A"],
  "agent_b_valid_points": ["List valid points from B"],
  "errors_identified": ["Any errors found"],
  "confidence": 0.0-1.0
}`
        }]
      })

      const content = response.content[0]
      if (content.type === 'text') {
        try {
          let jsonStr = content.text.trim()
          if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '')
          }
          const parsed = JSON.parse(jsonStr)

          const { data: resolved, error: resolveError } = await supabase
            .from('agent_disagreements')
            .update({
              resolution: parsed.resolution,
              resolved_by: 'arbitration_agent',
              resolved_at: new Date().toISOString()
            })
            .eq('id', disagreement.id)
            .select()
            .single()

          if (!resolveError) {
            return NextResponse.json({
              disagreement: resolved,
              arbitration: parsed
            }, { status: 201 })
          }
        } catch {
          // Continue without auto-resolution
        }
      }
    }

    return NextResponse.json({ disagreement }, { status: 201 })
  } catch (error) {
    console.error('Create disagreement error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/agents/disagreements - Resolve a disagreement manually
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { disagreement_id, resolution } = body

    if (!disagreement_id || !resolution) {
      return NextResponse.json({ error: 'disagreement_id and resolution required' }, { status: 400 })
    }

    const { data: disagreement, error } = await supabase
      .from('agent_disagreements')
      .update({
        resolution,
        resolved_by: 'user',
        resolved_at: new Date().toISOString()
      })
      .eq('id', disagreement_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ disagreement })
  } catch (error) {
    console.error('Resolve disagreement error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
