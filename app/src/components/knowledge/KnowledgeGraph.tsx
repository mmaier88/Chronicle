'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useKnowledgeGraph, GraphData } from '@/hooks/useKnowledgeGraph'

// Dynamic import to avoid SSR issues with canvas
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full">Loading graph...</div>,
})

interface KnowledgeGraphProps {
  workspaceId: string
  documentId?: string
  centerId?: string
  onNodeClick?: (nodeId: string) => void
}

const ENTITY_COLORS: Record<string, string> = {
  person: '#3b82f6', // blue
  organization: '#8b5cf6', // purple
  concept: '#10b981', // green
  claim: '#f59e0b', // amber
  methodology: '#ec4899', // pink
  finding: '#06b6d4', // cyan
  dataset: '#84cc16', // lime
  location: '#f97316', // orange
  event: '#6366f1', // indigo
  term: '#64748b', // slate
  other: '#9ca3af', // gray
}

const RELATIONSHIP_COLORS: Record<string, string> = {
  supports: '#22c55e', // green
  contradicts: '#ef4444', // red
  related_to: '#6b7280', // gray
  derived_from: '#8b5cf6', // purple
  part_of: '#3b82f6', // blue
  authored_by: '#f59e0b', // amber
  references: '#64748b', // slate
  defines: '#10b981', // emerald
  uses: '#06b6d4', // cyan
  causes: '#f97316', // orange
  precedes: '#a855f7', // violet
  equivalent_to: '#14b8a6', // teal
}

export function KnowledgeGraph({
  workspaceId,
  documentId,
  centerId,
  onNodeClick,
}: KnowledgeGraphProps) {
  const { getGraph, loading } = useKnowledgeGraph(workspaceId)
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [depth, setDepth] = useState(2)
  const [entityFilter, setEntityFilter] = useState<string[]>([])
  const [relationshipFilter, setRelationshipFilter] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const graphRef = useRef<{ zoomToFit: (ms?: number) => void } | null>(null)

  // Load graph data
  const loadGraph = useCallback(async () => {
    try {
      setError(null)
      const data = await getGraph({
        center_id: centerId,
        depth,
        limit: 200,
        entity_types: entityFilter.length > 0 ? entityFilter : undefined,
        relationship_types: relationshipFilter.length > 0 ? relationshipFilter : undefined,
        document_id: documentId,
      })
      setGraphData(data)

      // Zoom to fit after data loads
      setTimeout(() => {
        graphRef.current?.zoomToFit(400)
      }, 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graph')
    }
  }, [getGraph, centerId, depth, entityFilter, relationshipFilter, documentId])

  useEffect(() => {
    loadGraph()
  }, [loadGraph])

  // Transform data for force-graph
  const forceGraphData = graphData
    ? {
        nodes: graphData.nodes.map(n => ({
          id: n.id,
          name: n.name,
          type: n.type,
          val: Math.max(1, (n.mention_count || 0) * 0.5 + 1), // Node size based on mentions
          color: ENTITY_COLORS[n.type] || ENTITY_COLORS.other,
        })),
        links: graphData.edges.map(e => ({
          source: e.source,
          target: e.target,
          type: e.type,
          color: RELATIONSHIP_COLORS[e.type] || '#6b7280',
          curvature: 0.2,
        })),
      }
    : { nodes: [], links: [] }

  const handleNodeClick = useCallback(
    (node: { id: string }) => {
      setSelectedNode(node.id)
      onNodeClick?.(node.id)
    },
    [onNodeClick]
  )

  const entityTypes = Object.keys(ENTITY_COLORS)
  const relationshipTypes = Object.keys(RELATIONSHIP_COLORS)

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg border">
      {/* Controls */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Knowledge Graph</h3>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Depth:</label>
            <select
              value={depth}
              onChange={e => setDepth(parseInt(e.target.value))}
              className="text-sm border rounded px-2 py-1"
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
            <button
              onClick={loadGraph}
              disabled={loading}
              className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <label className="block text-gray-600 dark:text-gray-400 mb-1">Entity Types:</label>
            <div className="flex flex-wrap gap-1">
              {entityTypes.map(type => (
                <button
                  key={type}
                  onClick={() => {
                    setEntityFilter(prev =>
                      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
                    )
                  }}
                  className={`px-2 py-0.5 rounded text-xs ${
                    entityFilter.length === 0 || entityFilter.includes(type)
                      ? 'text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                  style={{
                    backgroundColor:
                      entityFilter.length === 0 || entityFilter.includes(type)
                        ? ENTITY_COLORS[type]
                        : undefined,
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1 relative">
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 dark:bg-red-900/20">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {!error && graphData && graphData.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p>No entities found</p>
              <p className="text-sm mt-1">Extract entities from documents to build your knowledge graph</p>
            </div>
          </div>
        )}

        {!error && forceGraphData.nodes.length > 0 && (
          <ForceGraph2D
            ref={graphRef as React.MutableRefObject<never>}
            graphData={forceGraphData}
            nodeLabel="name"
            nodeColor="color"
            nodeRelSize={6}
            linkColor="color"
            linkWidth={1.5}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            linkCurvature={0.2}
            linkLabel="type"
            onNodeClick={(node: unknown) => {
              const n = node as { id?: string }
              if (n.id) handleNodeClick({ id: n.id })
            }}
            cooldownTicks={100}
            onEngineStop={() => graphRef.current?.zoomToFit(400)}
            enableZoomInteraction={true}
            enablePanInteraction={true}
          />
        )}
      </div>

      {/* Stats */}
      {graphData?.stats && (
        <div className="p-3 border-t bg-gray-50 dark:bg-gray-800 text-sm">
          <div className="flex gap-4 text-gray-600 dark:text-gray-400">
            <span>
              <strong>{graphData.stats.node_count}</strong> entities
            </span>
            <span>
              <strong>{graphData.stats.edge_count}</strong> relationships
            </span>
            {selectedNode && (
              <span className="ml-auto">
                Selected: <strong>{graphData.nodes.find(n => n.id === selectedNode)?.name}</strong>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
