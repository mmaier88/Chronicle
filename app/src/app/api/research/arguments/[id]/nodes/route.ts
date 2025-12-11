import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/research/arguments/[id]/nodes - Get nodes for an argument map
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: mapId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: nodes, error } = await supabase
      .from('argument_nodes')
      .select(`
        *,
        source:sources (id, title),
        entity:knowledge_entities (id, name)
      `)
      .eq('map_id', mapId)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ nodes })
  } catch (error) {
    console.error('List argument nodes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/research/arguments/[id]/nodes - Add a node to an argument map
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: mapId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      parent_id,
      argument_type,
      stance,
      content,
      strength,
      source_id,
      entity_id,
      position_x,
      position_y
    } = body

    if (!argument_type || !content) {
      return NextResponse.json({ error: 'argument_type and content required' }, { status: 400 })
    }

    const { data: node, error } = await supabase
      .from('argument_nodes')
      .insert({
        map_id: mapId,
        parent_id,
        argument_type,
        stance: stance || 'neutral',
        content,
        strength: strength || 0.5,
        source_id,
        entity_id,
        position_x: position_x || 0,
        position_y: position_y || 0
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ node }, { status: 201 })
  } catch (error) {
    console.error('Create argument node error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/research/arguments/[id]/nodes - Update a node
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params // mapId not needed for update
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { node_id, ...updates } = body

    if (!node_id) {
      return NextResponse.json({ error: 'node_id required' }, { status: 400 })
    }

    const { data: node, error } = await supabase
      .from('argument_nodes')
      .update(updates)
      .eq('id', node_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ node })
  } catch (error) {
    console.error('Update argument node error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/research/arguments/[id]/nodes - Delete a node
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params // mapId not needed for delete
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const nodeId = searchParams.get('node_id')

    if (!nodeId) {
      return NextResponse.json({ error: 'node_id required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('argument_nodes')
      .delete()
      .eq('id', nodeId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete argument node error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
