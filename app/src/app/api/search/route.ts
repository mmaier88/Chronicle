import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface SearchResult {
  id: string
  type: 'document' | 'source' | 'entity' | 'section' | 'claim'
  title: string
  excerpt: string
  workspace_id: string
  workspace_name?: string
  document_id?: string
  document_title?: string
  relevance: number
  created_at: string
  metadata?: Record<string, unknown>
}

/**
 * GET /api/search - Global search across all content
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const workspaceId = searchParams.get('workspace_id')
    const types = searchParams.get('types')?.split(',') || ['document', 'source', 'entity', 'section']
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20))
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0') || 0)

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
    }

    const searchTerm = query.trim().toLowerCase()
    const results: SearchResult[] = []

    // Get user's accessible workspaces
    const { data: memberships } = await supabase
      .from('workspace_members')
      .select('workspace_id, workspace:workspaces(id, name)')
      .eq('user_id', user.id)

    const accessibleWorkspaces = memberships?.map(m => m.workspace_id) || []
    const workspaceNames = new Map<string, string>()
    memberships?.forEach(m => {
      const ws = m.workspace as unknown as { id: string; name: string } | null
      if (ws) workspaceNames.set(ws.id, ws.name)
    })

    if (accessibleWorkspaces.length === 0) {
      return NextResponse.json({ results: [], total: 0 })
    }

    // Filter by specific workspace if provided
    const targetWorkspaces = workspaceId
      ? accessibleWorkspaces.filter(id => id === workspaceId)
      : accessibleWorkspaces

    // Search documents
    if (types.includes('document')) {
      const { data: documents } = await supabase
        .from('documents')
        .select('id, title, created_at, workspace_id')
        .in('workspace_id', targetWorkspaces)
        .ilike('title', `%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(limit)

      documents?.forEach(doc => {
        results.push({
          id: doc.id,
          type: 'document',
          title: doc.title,
          excerpt: '',
          workspace_id: doc.workspace_id,
          workspace_name: workspaceNames.get(doc.workspace_id),
          relevance: doc.title.toLowerCase().includes(searchTerm) ? 1 : 0.5,
          created_at: doc.created_at,
        })
      })
    }

    // Search document sections (full-text) - filter by workspace server-side
    if (types.includes('section')) {
      const { data: sections } = await supabase
        .from('doc_sections')
        .select(`
          id,
          title,
          content_text,
          created_at,
          document:documents!inner(id, title, workspace_id)
        `)
        .in('documents.workspace_id', targetWorkspaces)
        .or(`title.ilike.%${searchTerm}%,content_text.ilike.%${searchTerm}%`)
        .limit(limit)

      sections?.forEach(section => {
        const doc = section.document as unknown as { id: string; title: string; workspace_id: string } | null
        if (!doc) return

        const contentText = section.content_text || ''
        const matchIndex = contentText.toLowerCase().indexOf(searchTerm)
        const excerpt = matchIndex >= 0
          ? '...' + contentText.slice(Math.max(0, matchIndex - 50), matchIndex + searchTerm.length + 100) + '...'
          : contentText.slice(0, 150) + '...'

        results.push({
          id: section.id,
          type: 'section',
          title: section.title || 'Untitled section',
          excerpt: excerpt.trim(),
          workspace_id: doc.workspace_id,
          workspace_name: workspaceNames.get(doc.workspace_id),
          document_id: doc.id,
          document_title: doc.title,
          relevance: contentText.toLowerCase().includes(searchTerm) ? 0.9 : 0.5,
          created_at: section.created_at,
        })
      })
    }

    // Search sources
    if (types.includes('source')) {
      const { data: sources } = await supabase
        .from('sources')
        .select('id, title, abstract, authors, created_at, workspace_id')
        .in('workspace_id', targetWorkspaces)
        .or(`title.ilike.%${searchTerm}%,abstract.ilike.%${searchTerm}%,authors.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(limit)

      sources?.forEach(source => {
        results.push({
          id: source.id,
          type: 'source',
          title: source.title,
          excerpt: source.abstract?.slice(0, 200) || '',
          workspace_id: source.workspace_id,
          workspace_name: workspaceNames.get(source.workspace_id),
          relevance: source.title.toLowerCase().includes(searchTerm) ? 1 : 0.7,
          created_at: source.created_at,
          metadata: { authors: source.authors },
        })
      })
    }

    // Search knowledge entities
    if (types.includes('entity')) {
      const { data: entities } = await supabase
        .from('knowledge_entities')
        .select('id, name, entity_type, description, created_at, workspace_id')
        .in('workspace_id', targetWorkspaces)
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(limit)

      entities?.forEach(entity => {
        results.push({
          id: entity.id,
          type: 'entity',
          title: entity.name,
          excerpt: entity.description || `${entity.entity_type} entity`,
          workspace_id: entity.workspace_id,
          workspace_name: workspaceNames.get(entity.workspace_id),
          relevance: entity.name.toLowerCase().includes(searchTerm) ? 1 : 0.6,
          created_at: entity.created_at,
          metadata: { entity_type: entity.entity_type },
        })
      })
    }

    // Search claims specifically
    if (types.includes('claim')) {
      const { data: claims } = await supabase
        .from('knowledge_entities')
        .select('id, name, description, created_at, workspace_id')
        .in('workspace_id', targetWorkspaces)
        .eq('entity_type', 'claim')
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(limit)

      claims?.forEach(claim => {
        results.push({
          id: claim.id,
          type: 'claim',
          title: claim.name,
          excerpt: claim.description || '',
          workspace_id: claim.workspace_id,
          workspace_name: workspaceNames.get(claim.workspace_id),
          relevance: claim.name.toLowerCase().includes(searchTerm) ? 1 : 0.7,
          created_at: claim.created_at,
        })
      })
    }

    // Sort by relevance and apply pagination
    results.sort((a, b) => b.relevance - a.relevance)
    const paginatedResults = results.slice(offset, offset + limit)

    return NextResponse.json({
      results: paginatedResults,
      total: results.length,
      query,
      limit,
      offset,
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
