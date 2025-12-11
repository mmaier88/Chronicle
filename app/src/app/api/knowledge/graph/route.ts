import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface GraphNode {
  id: string
  name: string
  type: string
  description?: string
  mention_count?: number
}

interface GraphEdge {
  id: string
  source: string
  target: string
  type: string
  weight: number
  description?: string
}

/**
 * GET /api/knowledge/graph - Get knowledge graph data for visualization
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
    const centerId = searchParams.get('center_id') // Optional: focus on specific entity
    const depth = parseInt(searchParams.get('depth') || '2')
    const limit = parseInt(searchParams.get('limit') || '100')
    const entityTypes = searchParams.get('entity_types')?.split(',')
    const relationshipTypes = searchParams.get('relationship_types')?.split(',')
    const documentId = searchParams.get('document_id') // Filter by document

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
    }

    // Use the database function for graph traversal if we have a center
    if (centerId) {
      const { data: graphData, error } = await supabase.rpc('get_entity_graph', {
        p_workspace_id: workspaceId,
        p_center_entity_id: centerId,
        p_depth: depth,
        p_limit: limit,
      })

      if (error) {
        console.error('Graph RPC error:', error)
        // Fall back to manual query
      } else if (graphData) {
        return NextResponse.json(graphData)
      }
    }

    // Manual query for full graph or filtered views
    let entitiesQuery = supabase
      .from('knowledge_entities')
      .select('id, name, entity_type, description')
      .eq('workspace_id', workspaceId)
      .limit(limit)

    if (entityTypes && entityTypes.length > 0) {
      entitiesQuery = entitiesQuery.in('entity_type', entityTypes)
    }

    // If filtering by document, only get entities with mentions in that document
    if (documentId) {
      const { data: mentionedEntities } = await supabase
        .from('entity_mentions')
        .select('entity_id')
        .eq('document_id', documentId)

      if (mentionedEntities && mentionedEntities.length > 0) {
        const entityIds = mentionedEntities.map(m => m.entity_id)
        entitiesQuery = entitiesQuery.in('id', entityIds)
      } else {
        return NextResponse.json({ nodes: [], edges: [] })
      }
    }

    const { data: entities, error: entitiesError } = await entitiesQuery

    if (entitiesError) {
      return NextResponse.json({ error: entitiesError.message }, { status: 500 })
    }

    // Get mention counts for each entity
    const entityIds = entities?.map(e => e.id) || []
    const mentionCounts = new Map<string, number>()

    if (entityIds.length > 0) {
      const { data: counts } = await supabase
        .from('entity_mentions')
        .select('entity_id')
        .in('entity_id', entityIds)

      if (counts) {
        for (const mention of counts) {
          const current = mentionCounts.get(mention.entity_id) || 0
          mentionCounts.set(mention.entity_id, current + 1)
        }
      }
    }

    // Build nodes
    const nodes: GraphNode[] = (entities || []).map(e => ({
      id: e.id,
      name: e.name,
      type: e.entity_type,
      description: e.description,
      mention_count: mentionCounts.get(e.id) || 0,
    }))

    // Get relationships
    let relationshipsQuery = supabase
      .from('entity_relationships')
      .select('id, source_entity_id, target_entity_id, relationship_type, weight, description')
      .eq('workspace_id', workspaceId)

    if (entityIds.length > 0) {
      relationshipsQuery = relationshipsQuery.or(
        `source_entity_id.in.(${entityIds.join(',')}),target_entity_id.in.(${entityIds.join(',')})`
      )
    }

    if (relationshipTypes && relationshipTypes.length > 0) {
      relationshipsQuery = relationshipsQuery.in('relationship_type', relationshipTypes)
    }

    const { data: relationships, error: relationshipsError } = await relationshipsQuery

    if (relationshipsError) {
      return NextResponse.json({ error: relationshipsError.message }, { status: 500 })
    }

    // Filter edges to only include those where both nodes exist
    const nodeIds = new Set(nodes.map(n => n.id))
    const edges: GraphEdge[] = (relationships || [])
      .filter(r => nodeIds.has(r.source_entity_id) && nodeIds.has(r.target_entity_id))
      .map(r => ({
        id: r.id,
        source: r.source_entity_id,
        target: r.target_entity_id,
        type: r.relationship_type,
        weight: r.weight,
        description: r.description,
      }))

    return NextResponse.json({
      nodes,
      edges,
      stats: {
        node_count: nodes.length,
        edge_count: edges.length,
        entity_types: [...new Set(nodes.map(n => n.type))],
        relationship_types: [...new Set(edges.map(e => e.type))],
      },
    })

  } catch (error) {
    console.error('Get graph error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/knowledge/graph - Save graph snapshot
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workspace_id, name, description } = body

    if (!workspace_id || !name) {
      return NextResponse.json({ error: 'workspace_id and name required' }, { status: 400 })
    }

    // Verify workspace access - only admin/owner can create snapshots
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .single()

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Get current graph state
    const { data: entities } = await supabase
      .from('knowledge_entities')
      .select('*')
      .eq('workspace_id', workspace_id)

    const { data: relationships } = await supabase
      .from('entity_relationships')
      .select('*')
      .eq('workspace_id', workspace_id)

    const snapshotData = {
      entities: entities || [],
      relationships: relationships || [],
      created_at: new Date().toISOString(),
    }

    const { data: snapshot, error } = await supabase
      .from('graph_snapshots')
      .insert({
        workspace_id,
        name,
        description,
        entity_count: (entities || []).length,
        relationship_count: (relationships || []).length,
        snapshot_data: snapshotData,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ snapshot }, { status: 201 })

  } catch (error) {
    console.error('Create snapshot error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
