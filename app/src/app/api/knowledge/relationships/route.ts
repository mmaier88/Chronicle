import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/knowledge/relationships - List relationships in a workspace
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
    const entityId = searchParams.get('entity_id')
    const relationshipType = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
    }

    let query = supabase
      .from('entity_relationships')
      .select(`
        *,
        source:knowledge_entities!source_entity_id(id, name, entity_type),
        target:knowledge_entities!target_entity_id(id, name, entity_type),
        evidence_document:documents(id, title)
      `, { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (entityId) {
      query = query.or(`source_entity_id.eq.${entityId},target_entity_id.eq.${entityId}`)
    }

    if (relationshipType) {
      query = query.eq('relationship_type', relationshipType)
    }

    const { data: relationships, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      relationships,
      total: count,
      limit,
      offset,
    })

  } catch (error) {
    console.error('List relationships error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/knowledge/relationships - Create a new relationship
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
      source_entity_id,
      target_entity_id,
      relationship_type,
      description,
      evidence_document_id,
      evidence_text,
      weight = 1.0,
      confidence = 1.0,
    } = body

    if (!workspace_id || !source_entity_id || !target_entity_id || !relationship_type) {
      return NextResponse.json({
        error: 'workspace_id, source_entity_id, target_entity_id, and relationship_type required',
      }, { status: 400 })
    }

    // Verify workspace access
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .single()

    if (!member || !['owner', 'admin', 'editor'].includes(member.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Verify both entities exist in this workspace
    const { data: sourceEntity } = await supabase
      .from('knowledge_entities')
      .select('id')
      .eq('id', source_entity_id)
      .eq('workspace_id', workspace_id)
      .single()

    const { data: targetEntity } = await supabase
      .from('knowledge_entities')
      .select('id')
      .eq('id', target_entity_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (!sourceEntity || !targetEntity) {
      return NextResponse.json({ error: 'One or both entities not found in workspace' }, { status: 404 })
    }

    const { data: relationship, error } = await supabase
      .from('entity_relationships')
      .upsert({
        workspace_id,
        source_entity_id,
        target_entity_id,
        relationship_type,
        description,
        evidence_document_id,
        evidence_text,
        weight,
        confidence,
      }, {
        onConflict: 'source_entity_id,target_entity_id,relationship_type',
      })
      .select(`
        *,
        source:knowledge_entities!source_entity_id(id, name, entity_type),
        target:knowledge_entities!target_entity_id(id, name, entity_type)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ relationship }, { status: 201 })

  } catch (error) {
    console.error('Create relationship error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/knowledge/relationships - Delete a relationship
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const relationshipId = searchParams.get('id')

    if (!relationshipId) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    // Get relationship to check workspace
    const { data: relationship } = await supabase
      .from('entity_relationships')
      .select('workspace_id')
      .eq('id', relationshipId)
      .single()

    if (!relationship) {
      return NextResponse.json({ error: 'Relationship not found' }, { status: 404 })
    }

    // Verify workspace access
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', relationship.workspace_id)
      .eq('user_id', user.id)
      .single()

    if (!member || !['owner', 'admin', 'editor'].includes(member.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { error } = await supabase
      .from('entity_relationships')
      .delete()
      .eq('id', relationshipId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete relationship error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
