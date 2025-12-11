import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/knowledge/entities/[id] - Get entity details with mentions
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

    // Get entity with related data
    const { data: entity, error } = await supabase
      .from('knowledge_entities')
      .select(`
        *,
        mentions:entity_mentions(
          id,
          document_id,
          section_id,
          mention_text,
          context_text,
          confidence,
          created_at,
          document:documents(id, title)
        ),
        outgoing_relationships:entity_relationships!source_entity_id(
          id,
          target_entity_id,
          relationship_type,
          description,
          confidence,
          target:knowledge_entities!target_entity_id(id, name, entity_type)
        ),
        incoming_relationships:entity_relationships!target_entity_id(
          id,
          source_entity_id,
          relationship_type,
          description,
          confidence,
          source:knowledge_entities!source_entity_id(id, name, entity_type)
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 })
    }

    return NextResponse.json({ entity })

  } catch (error) {
    console.error('Get entity error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/knowledge/entities/[id] - Update entity
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

    // Get entity to check workspace
    const { data: existingEntity } = await supabase
      .from('knowledge_entities')
      .select('workspace_id')
      .eq('id', id)
      .single()

    if (!existingEntity) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 })
    }

    // Verify workspace access
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', existingEntity.workspace_id)
      .eq('user_id', user.id)
      .single()

    if (!member || !['owner', 'admin', 'editor'].includes(member.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, aliases, properties } = body

    const updates: Record<string, unknown> = {}
    if (name !== undefined) {
      updates.name = name
      updates.normalized_name = name.toLowerCase().trim().replace(/\s+/g, ' ')
    }
    if (description !== undefined) updates.description = description
    if (aliases !== undefined) updates.aliases = aliases
    if (properties !== undefined) updates.properties = properties

    const { data: entity, error } = await supabase
      .from('knowledge_entities')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ entity })

  } catch (error) {
    console.error('Update entity error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/knowledge/entities/[id] - Delete entity
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

    // Get entity to check workspace
    const { data: entity } = await supabase
      .from('knowledge_entities')
      .select('workspace_id')
      .eq('id', id)
      .single()

    if (!entity) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 })
    }

    // Verify workspace access - only admin/owner can delete
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', entity.workspace_id)
      .eq('user_id', user.id)
      .single()

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { error } = await supabase
      .from('knowledge_entities')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete entity error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/knowledge/entities/[id] - Merge with another entity
 */
export async function POST(
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

    const body = await request.json()
    const { merge_with_id } = body

    if (!merge_with_id) {
      return NextResponse.json({ error: 'merge_with_id required' }, { status: 400 })
    }

    // Get both entities
    const { data: primaryEntity } = await supabase
      .from('knowledge_entities')
      .select('*')
      .eq('id', id)
      .single()

    const { data: secondaryEntity } = await supabase
      .from('knowledge_entities')
      .select('*')
      .eq('id', merge_with_id)
      .single()

    if (!primaryEntity || !secondaryEntity) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 })
    }

    if (primaryEntity.workspace_id !== secondaryEntity.workspace_id) {
      return NextResponse.json({ error: 'Cannot merge entities from different workspaces' }, { status: 400 })
    }

    // Verify workspace access
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', primaryEntity.workspace_id)
      .eq('user_id', user.id)
      .single()

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Merge aliases
    const mergedAliases = [...new Set([
      ...(primaryEntity.aliases || []),
      ...(secondaryEntity.aliases || []),
      secondaryEntity.name, // Add secondary name as alias
    ])]

    // Update primary entity
    await supabase
      .from('knowledge_entities')
      .update({
        aliases: mergedAliases,
        description: primaryEntity.description || secondaryEntity.description,
      })
      .eq('id', id)

    // Move mentions from secondary to primary
    await supabase
      .from('entity_mentions')
      .update({ entity_id: id })
      .eq('entity_id', merge_with_id)

    // Update relationships - source
    await supabase
      .from('entity_relationships')
      .update({ source_entity_id: id })
      .eq('source_entity_id', merge_with_id)

    // Update relationships - target
    await supabase
      .from('entity_relationships')
      .update({ target_entity_id: id })
      .eq('target_entity_id', merge_with_id)

    // Update contradictions
    await supabase
      .from('contradictions')
      .update({ claim_a_entity_id: id })
      .eq('claim_a_entity_id', merge_with_id)

    await supabase
      .from('contradictions')
      .update({ claim_b_entity_id: id })
      .eq('claim_b_entity_id', merge_with_id)

    // Delete secondary entity
    await supabase
      .from('knowledge_entities')
      .delete()
      .eq('id', merge_with_id)

    // Get updated entity
    const { data: mergedEntity } = await supabase
      .from('knowledge_entities')
      .select('*')
      .eq('id', id)
      .single()

    return NextResponse.json({
      entity: mergedEntity,
      merged_from: secondaryEntity.name,
    })

  } catch (error) {
    console.error('Merge entity error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
