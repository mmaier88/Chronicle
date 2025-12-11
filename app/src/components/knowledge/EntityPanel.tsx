'use client'

import { useState, useEffect } from 'react'
import { useKnowledgeGraph, KnowledgeEntity } from '@/hooks/useKnowledgeGraph'

interface EntityPanelProps {
  workspaceId: string
  entityId: string
  onClose: () => void
  onNavigate?: (entityId: string) => void
}

interface EntityDetails extends KnowledgeEntity {
  mentions: Array<{
    id: string
    document_id: string
    mention_text: string
    context_text?: string
    document?: { id: string; title: string }
  }>
  outgoing_relationships: Array<{
    id: string
    target_entity_id: string
    relationship_type: string
    description?: string
    target?: { id: string; name: string; entity_type: string }
  }>
  incoming_relationships: Array<{
    id: string
    source_entity_id: string
    relationship_type: string
    description?: string
    source?: { id: string; name: string; entity_type: string }
  }>
}

export function EntityPanel({ workspaceId, entityId, onClose, onNavigate }: EntityPanelProps) {
  const { getEntity, updateEntity, deleteEntity } = useKnowledgeGraph(workspaceId)
  const [entity, setEntity] = useState<EntityDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await getEntity(entityId)
        setEntity(data as EntityDetails)
        setEditName(data.name)
        setEditDescription(data.description || '')
      } catch (err) {
        console.error('Failed to load entity:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [entityId, getEntity])

  const handleSave = async () => {
    if (!entity) return
    try {
      await updateEntity(entityId, {
        name: editName,
        description: editDescription,
      })
      setEntity({ ...entity, name: editName, description: editDescription })
      setEditing(false)
    } catch (err) {
      console.error('Failed to update entity:', err)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this entity? This cannot be undone.')) return
    try {
      await deleteEntity(entityId)
      onClose()
    } catch (err) {
      console.error('Failed to delete entity:', err)
    }
  }

  if (loading) {
    return (
      <div className="p-4 bg-white dark:bg-gray-900 border rounded-lg">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  if (!entity) {
    return (
      <div className="p-4 bg-white dark:bg-gray-900 border rounded-lg">
        <p className="text-gray-500">Entity not found</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b flex items-start justify-between">
        <div className="flex-1">
          {editing ? (
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="text-lg font-semibold w-full border rounded px-2 py-1"
            />
          ) : (
            <h3 className="text-lg font-semibold">{entity.name}</h3>
          )}
          <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {entity.entity_type}
          </span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {/* Description */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Description</h4>
          {editing ? (
            <textarea
              value={editDescription}
              onChange={e => setEditDescription(e.target.value)}
              rows={3}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          ) : (
            <p className="text-sm">{entity.description || 'No description'}</p>
          )}
        </div>

        {/* Aliases */}
        {entity.aliases && entity.aliases.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Aliases</h4>
            <div className="flex flex-wrap gap-1">
              {entity.aliases.map((alias, i) => (
                <span key={i} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                  {alias}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Relationships */}
        {(entity.outgoing_relationships?.length > 0 || entity.incoming_relationships?.length > 0) && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Relationships</h4>
            <div className="space-y-1">
              {entity.outgoing_relationships?.map(rel => (
                <div
                  key={rel.id}
                  className="text-sm flex items-center gap-2 p-1 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer"
                  onClick={() => rel.target && onNavigate?.(rel.target.id)}
                >
                  <span className="text-gray-400">→</span>
                  <span className="text-blue-600">{rel.relationship_type}</span>
                  <span className="font-medium">{rel.target?.name}</span>
                </div>
              ))}
              {entity.incoming_relationships?.map(rel => (
                <div
                  key={rel.id}
                  className="text-sm flex items-center gap-2 p-1 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer"
                  onClick={() => rel.source && onNavigate?.(rel.source.id)}
                >
                  <span className="text-gray-400">←</span>
                  <span className="text-blue-600">{rel.relationship_type}</span>
                  <span className="font-medium">{rel.source?.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mentions */}
        {entity.mentions && entity.mentions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">
              Document Mentions ({entity.mentions.length})
            </h4>
            <div className="space-y-2">
              {entity.mentions.slice(0, 5).map(mention => (
                <div key={mention.id} className="text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <p className="text-xs text-gray-500 mb-1">{mention.document?.title || 'Unknown document'}</p>
                  <p className="italic">&quot;{mention.context_text || mention.mention_text}&quot;</p>
                </div>
              ))}
              {entity.mentions.length > 5 && (
                <p className="text-xs text-gray-500">
                  +{entity.mentions.length - 5} more mentions
                </p>
              )}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="text-xs text-gray-400 pt-2 border-t">
          <p>Confidence: {(entity.confidence * 100).toFixed(0)}%</p>
          <p>Created: {new Date(entity.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t bg-gray-50 dark:bg-gray-800 flex gap-2">
        {editing ? (
          <>
            <button
              onClick={handleSave}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  )
}
