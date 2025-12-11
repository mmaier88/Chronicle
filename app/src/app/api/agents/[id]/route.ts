import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/agents/[id] - Get agent definition
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: agent, error } = await supabase
      .from('agent_definitions')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json({ agent })
  } catch (error) {
    console.error('Get agent error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/agents/[id] - Update agent definition
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if it's a default agent
    const { data: existing } = await supabase
      .from('agent_definitions')
      .select('is_default')
      .eq('id', id)
      .single()

    if (existing?.is_default) {
      return NextResponse.json({ error: 'Cannot modify default agents' }, { status: 403 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    const allowedFields = [
      'name', 'description', 'system_prompt', 'model', 'temperature',
      'max_tokens', 'can_search_sources', 'can_search_entities',
      'can_create_entities', 'can_modify_document'
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    const { data: agent, error } = await supabase
      .from('agent_definitions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ agent })
  } catch (error) {
    console.error('Update agent error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/agents/[id] - Delete agent definition
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if it's a default agent
    const { data: existing } = await supabase
      .from('agent_definitions')
      .select('is_default')
      .eq('id', id)
      .single()

    if (existing?.is_default) {
      return NextResponse.json({ error: 'Cannot delete default agents' }, { status: 403 })
    }

    const { error } = await supabase
      .from('agent_definitions')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete agent error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
