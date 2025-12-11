'use client'

import { useState, useCallback } from 'react'

export interface KnowledgeEntity {
  id: string
  workspace_id: string
  name: string
  normalized_name: string
  entity_type: 'person' | 'organization' | 'concept' | 'claim' | 'methodology' | 'finding' | 'dataset' | 'location' | 'event' | 'term' | 'other'
  description?: string
  aliases: string[]
  properties: Record<string, unknown>
  confidence: number
  created_at: string
  updated_at: string
  mention_count?: number
}

export interface EntityRelationship {
  id: string
  workspace_id: string
  source_entity_id: string
  target_entity_id: string
  relationship_type: 'supports' | 'contradicts' | 'related_to' | 'derived_from' | 'part_of' | 'authored_by' | 'references' | 'defines' | 'uses' | 'causes' | 'precedes' | 'equivalent_to'
  description?: string
  weight: number
  confidence: number
  evidence_document_id?: string
  evidence_text?: string
  source?: KnowledgeEntity
  target?: KnowledgeEntity
}

export interface Contradiction {
  id: string
  workspace_id: string
  claim_a_entity_id: string
  claim_b_entity_id: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'detected' | 'confirmed' | 'resolved' | 'dismissed'
  analysis?: Record<string, unknown>
  resolution_suggestion?: string
  resolved_by?: string
  resolved_at?: string
  resolution_notes?: string
  claim_a?: KnowledgeEntity
  claim_b?: KnowledgeEntity
}

export interface GraphData {
  nodes: Array<{
    id: string
    name: string
    type: string
    description?: string
    mention_count?: number
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    type: string
    weight: number
    description?: string
  }>
  stats?: {
    node_count: number
    edge_count: number
    entity_types: string[]
    relationship_types: string[]
  }
}

export function useKnowledgeGraph(workspaceId: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Extract entities from content
  const extractEntities = useCallback(async (
    content: string,
    options?: {
      document_id?: string
      section_id?: string
      save_results?: boolean
    }
  ) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/knowledge/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          content,
          ...options,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Extraction failed')
      }

      return await res.json()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Extraction failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  // List entities
  const listEntities = useCallback(async (options?: {
    type?: string
    search?: string
    limit?: number
    offset?: number
  }) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ workspace_id: workspaceId })
      if (options?.type) params.set('type', options.type)
      if (options?.search) params.set('search', options.search)
      if (options?.limit) params.set('limit', options.limit.toString())
      if (options?.offset) params.set('offset', options.offset.toString())

      const res = await fetch(`/api/knowledge/entities?${params}`)
      if (!res.ok) throw new Error('Failed to fetch entities')

      return await res.json() as {
        entities: KnowledgeEntity[]
        total: number
        limit: number
        offset: number
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch entities'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  // Get entity details
  const getEntity = useCallback(async (entityId: string) => {
    const res = await fetch(`/api/knowledge/entities/${entityId}`)
    if (!res.ok) throw new Error('Failed to fetch entity')
    const data = await res.json()
    return data.entity as KnowledgeEntity & {
      mentions: Array<{
        id: string
        document_id: string
        mention_text: string
        context_text?: string
        document?: { id: string; title: string }
      }>
      outgoing_relationships: EntityRelationship[]
      incoming_relationships: EntityRelationship[]
    }
  }, [])

  // Create entity
  const createEntity = useCallback(async (entity: {
    name: string
    entity_type: KnowledgeEntity['entity_type']
    description?: string
    aliases?: string[]
    properties?: Record<string, unknown>
  }) => {
    const res = await fetch('/api/knowledge/entities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: workspaceId,
        ...entity,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to create entity')
    }

    const data = await res.json()
    return data.entity as KnowledgeEntity
  }, [workspaceId])

  // Update entity
  const updateEntity = useCallback(async (
    entityId: string,
    updates: {
      name?: string
      description?: string
      aliases?: string[]
      properties?: Record<string, unknown>
    }
  ) => {
    const res = await fetch(`/api/knowledge/entities/${entityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to update entity')
    }

    const data = await res.json()
    return data.entity as KnowledgeEntity
  }, [])

  // Delete entity
  const deleteEntity = useCallback(async (entityId: string) => {
    const res = await fetch(`/api/knowledge/entities/${entityId}`, {
      method: 'DELETE',
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to delete entity')
    }
  }, [])

  // Merge entities
  const mergeEntities = useCallback(async (primaryId: string, secondaryId: string) => {
    const res = await fetch(`/api/knowledge/entities/${primaryId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merge_with_id: secondaryId }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to merge entities')
    }

    return await res.json()
  }, [])

  // List relationships
  const listRelationships = useCallback(async (options?: {
    entity_id?: string
    type?: string
    limit?: number
    offset?: number
  }) => {
    const params = new URLSearchParams({ workspace_id: workspaceId })
    if (options?.entity_id) params.set('entity_id', options.entity_id)
    if (options?.type) params.set('type', options.type)
    if (options?.limit) params.set('limit', options.limit.toString())
    if (options?.offset) params.set('offset', options.offset.toString())

    const res = await fetch(`/api/knowledge/relationships?${params}`)
    if (!res.ok) throw new Error('Failed to fetch relationships')

    return await res.json() as {
      relationships: EntityRelationship[]
      total: number
      limit: number
      offset: number
    }
  }, [workspaceId])

  // Create relationship
  const createRelationship = useCallback(async (relationship: {
    source_entity_id: string
    target_entity_id: string
    relationship_type: EntityRelationship['relationship_type']
    description?: string
    evidence_document_id?: string
    evidence_text?: string
    weight?: number
    confidence?: number
  }) => {
    const res = await fetch('/api/knowledge/relationships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: workspaceId,
        ...relationship,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to create relationship')
    }

    const data = await res.json()
    return data.relationship as EntityRelationship
  }, [workspaceId])

  // Delete relationship
  const deleteRelationship = useCallback(async (relationshipId: string) => {
    const res = await fetch(`/api/knowledge/relationships?id=${relationshipId}`, {
      method: 'DELETE',
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to delete relationship')
    }
  }, [])

  // Detect contradictions
  const detectContradictions = useCallback(async (options: {
    claims?: string[]
    entity_ids?: string[]
    document_ids?: string[]
    save_results?: boolean
  }) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/knowledge/contradictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          ...options,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Contradiction detection failed')
      }

      return await res.json()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Contradiction detection failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  // List contradictions
  const listContradictions = useCallback(async (options?: {
    status?: Contradiction['status']
    severity?: Contradiction['severity']
    limit?: number
    offset?: number
  }) => {
    const params = new URLSearchParams({ workspace_id: workspaceId })
    if (options?.status) params.set('status', options.status)
    if (options?.severity) params.set('severity', options.severity)
    if (options?.limit) params.set('limit', options.limit.toString())
    if (options?.offset) params.set('offset', options.offset.toString())

    const res = await fetch(`/api/knowledge/contradictions?${params}`)
    if (!res.ok) throw new Error('Failed to fetch contradictions')

    return await res.json() as {
      contradictions: Contradiction[]
      total: number
      limit: number
      offset: number
    }
  }, [workspaceId])

  // Update contradiction status
  const updateContradiction = useCallback(async (
    contradictionId: string,
    updates: {
      status?: Contradiction['status']
      resolution_notes?: string
    }
  ) => {
    const res = await fetch('/api/knowledge/contradictions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contradiction_id: contradictionId,
        ...updates,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to update contradiction')
    }

    const data = await res.json()
    return data.contradiction as Contradiction
  }, [])

  // Get graph data
  const getGraph = useCallback(async (options?: {
    center_id?: string
    depth?: number
    limit?: number
    entity_types?: string[]
    relationship_types?: string[]
    document_id?: string
  }) => {
    const params = new URLSearchParams({ workspace_id: workspaceId })
    if (options?.center_id) params.set('center_id', options.center_id)
    if (options?.depth) params.set('depth', options.depth.toString())
    if (options?.limit) params.set('limit', options.limit.toString())
    if (options?.entity_types) params.set('entity_types', options.entity_types.join(','))
    if (options?.relationship_types) params.set('relationship_types', options.relationship_types.join(','))
    if (options?.document_id) params.set('document_id', options.document_id)

    const res = await fetch(`/api/knowledge/graph?${params}`)
    if (!res.ok) throw new Error('Failed to fetch graph')

    return await res.json() as GraphData
  }, [workspaceId])

  // Create graph snapshot
  const createSnapshot = useCallback(async (name: string, description?: string) => {
    const res = await fetch('/api/knowledge/graph', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: workspaceId,
        name,
        description,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to create snapshot')
    }

    return await res.json()
  }, [workspaceId])

  return {
    // State
    loading,
    error,

    // Entity operations
    extractEntities,
    listEntities,
    getEntity,
    createEntity,
    updateEntity,
    deleteEntity,
    mergeEntities,

    // Relationship operations
    listRelationships,
    createRelationship,
    deleteRelationship,

    // Contradiction operations
    detectContradictions,
    listContradictions,
    updateContradiction,

    // Graph operations
    getGraph,
    createSnapshot,
  }
}
