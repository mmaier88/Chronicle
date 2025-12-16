import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/knowledge/entities - List entities in a workspace
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
    const entityType = searchParams.get('type')
    const search = searchParams.get('search')
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50') || 50))
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0') || 0)

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
    }

    // SECURITY: Verify user has access to this workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    let query = supabase
      .from('knowledge_entities')
      .select('*, mention_count:entity_mentions(count)', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (entityType) {
      query = query.eq('entity_type', entityType)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data: entities, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      entities,
      total: count,
      limit,
      offset,
    })

  } catch (error) {
    console.error('List entities error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/knowledge/entities - Create a new entity manually
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workspace_id, name, entity_type, description, aliases, properties } = body

    if (!workspace_id || !name || !entity_type) {
      return NextResponse.json({ error: 'workspace_id, name, and entity_type required' }, { status: 400 })
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

    const normalizedName = name.toLowerCase().trim().replace(/\s+/g, ' ')

    // Check for existing entity
    const { data: existing } = await supabase
      .from('knowledge_entities')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('normalized_name', normalizedName)
      .eq('entity_type', entity_type)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Entity already exists', existing_id: existing.id }, { status: 409 })
    }

    const { data: entity, error } = await supabase
      .from('knowledge_entities')
      .insert({
        workspace_id,
        name,
        normalized_name: normalizedName,
        entity_type,
        description,
        aliases: aliases || [],
        properties: properties || {},
        confidence: 1.0, // Manual entries are high confidence
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ entity }, { status: 201 })

  } catch (error) {
    console.error('Create entity error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
