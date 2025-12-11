'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { KnowledgeGraph } from '@/components/knowledge/KnowledgeGraph'
import { EntityPanel } from '@/components/knowledge/EntityPanel'
import { useKnowledgeGraph } from '@/hooks/useKnowledgeGraph'

interface Workspace {
  id: string
  name: string
}

export default function KnowledgePage() {
  const searchParams = useSearchParams()
  const workspaceIdParam = searchParams.get('workspace')

  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(workspaceIdParam)
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [queryResult, setQueryResult] = useState<{
    answer: string
    relevant_entities: string[]
    confidence: string
    gaps: string[]
  } | null>(null)
  const [queryLoading, setQueryLoading] = useState(false)

  const { listContradictions } = useKnowledgeGraph(selectedWorkspaceId || '')
  const [contradictions, setContradictions] = useState<Array<{
    id: string
    description: string
    severity: string
    status: string
  }>>([])

  // Load workspaces
  useEffect(() => {
    async function loadWorkspaces() {
      const supabase = createClient()
      const { data: memberships } = await supabase
        .from('workspace_members')
        .select('workspace:workspaces(id, name)')

      if (memberships) {
        const ws: Workspace[] = []
        for (const m of memberships) {
          const workspace = m.workspace as unknown
          if (workspace && typeof workspace === 'object' && 'id' in workspace && 'name' in workspace) {
            ws.push(workspace as Workspace)
          }
        }
        setWorkspaces(ws)
        if (!selectedWorkspaceId && ws.length > 0) {
          setSelectedWorkspaceId(ws[0].id)
        }
      }
    }
    loadWorkspaces()
  }, [selectedWorkspaceId])

  // Load contradictions when workspace changes
  useEffect(() => {
    if (!selectedWorkspaceId) return

    async function loadContradictions() {
      try {
        const data = await listContradictions({ status: 'detected', limit: 10 })
        setContradictions(data.contradictions || [])
      } catch {
        // Ignore errors
      }
    }
    loadContradictions()
  }, [selectedWorkspaceId, listContradictions])

  // Natural language query
  const handleQuery = async () => {
    if (!query.trim() || !selectedWorkspaceId) return

    setQueryLoading(true)
    setQueryResult(null)

    try {
      const res = await fetch('/api/knowledge/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: selectedWorkspaceId,
          query: query.trim(),
        }),
      })

      if (!res.ok) throw new Error('Query failed')

      const data = await res.json()
      setQueryResult(data.result)
    } catch (err) {
      console.error('Query error:', err)
    } finally {
      setQueryLoading(false)
    }
  }

  if (!selectedWorkspaceId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Knowledge Graph</h1>
        <p className="text-gray-500">Select a workspace to view its knowledge graph.</p>
        <div className="mt-4 space-y-2">
          {workspaces.map(ws => (
            <button
              key={ws.id}
              onClick={() => setSelectedWorkspaceId(ws.id)}
              className="block w-full text-left px-4 py-2 border rounded hover:bg-gray-50"
            >
              {ws.name}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-white dark:bg-gray-900 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Knowledge Graph</h1>
          <select
            value={selectedWorkspaceId}
            onChange={e => setSelectedWorkspaceId(e.target.value)}
            className="border rounded px-2 py-1"
          >
            {workspaces.map(ws => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Graph */}
        <div className="flex-1 p-4">
          <KnowledgeGraph
            workspaceId={selectedWorkspaceId}
            centerId={selectedEntityId || undefined}
            onNodeClick={setSelectedEntityId}
          />
        </div>

        {/* Sidebar */}
        <div className="w-96 border-l bg-gray-50 dark:bg-gray-800 overflow-y-auto">
          {/* Query */}
          <div className="p-4 border-b bg-white dark:bg-gray-900">
            <h3 className="font-semibold mb-2">Ask your knowledge base</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleQuery()}
                placeholder="What do we know about...?"
                className="flex-1 border rounded px-3 py-2 text-sm"
              />
              <button
                onClick={handleQuery}
                disabled={queryLoading || !query.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {queryLoading ? '...' : 'Ask'}
              </button>
            </div>

            {queryResult && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                <p className="mb-2">{queryResult.answer}</p>
                {queryResult.relevant_entities.length > 0 && (
                  <p className="text-xs text-gray-500">
                    Related: {queryResult.relevant_entities.join(', ')}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Confidence: {queryResult.confidence}
                </p>
              </div>
            )}
          </div>

          {/* Entity Panel */}
          {selectedEntityId && (
            <div className="p-4 border-b">
              <EntityPanel
                workspaceId={selectedWorkspaceId}
                entityId={selectedEntityId}
                onClose={() => setSelectedEntityId(null)}
                onNavigate={setSelectedEntityId}
              />
            </div>
          )}

          {/* Contradictions */}
          {contradictions.length > 0 && (
            <div className="p-4">
              <h3 className="font-semibold mb-2">Detected Contradictions</h3>
              <div className="space-y-2">
                {contradictions.map(c => (
                  <div
                    key={c.id}
                    className={`p-2 rounded text-sm ${
                      c.severity === 'critical'
                        ? 'bg-red-100 dark:bg-red-900/30'
                        : c.severity === 'high'
                        ? 'bg-orange-100 dark:bg-orange-900/30'
                        : 'bg-yellow-100 dark:bg-yellow-900/30'
                    }`}
                  >
                    <span className="text-xs font-medium uppercase text-gray-500">{c.severity}</span>
                    <p className="mt-1">{c.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick queries */}
          <div className="p-4">
            <h3 className="font-semibold mb-2">Quick Queries</h3>
            <div className="space-y-1">
              {[
                'What are our main findings?',
                'What claims lack supporting evidence?',
                'What are the key contradictions?',
                'Who are the main researchers mentioned?',
                'What methodologies do we reference?',
              ].map(q => (
                <button
                  key={q}
                  onClick={() => {
                    setQuery(q)
                    handleQuery()
                  }}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-white dark:hover:bg-gray-700 rounded"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
