'use client'

import { useState } from 'react'

interface Claim {
  id: string
  type: 'claim' | 'assumption' | 'definition' | 'evidence'
  text: string
  confidence: number
}

interface ClaimLink {
  sourceId: string
  targetId: string
  relationship: 'supports' | 'contradicts' | 'depends_on' | 'refines' | 'exemplifies'
  strength: number
}

interface ClaimGraph {
  claims: Claim[]
  links: ClaimLink[]
  summary: string
}

interface ArgumentPanelProps {
  documentContent: string
  documentId?: string
  isOpen: boolean
  onClose: () => void
}

export function ArgumentPanel({ documentContent, documentId, isOpen, onClose }: ArgumentPanelProps) {
  const [graph, setGraph] = useState<ClaimGraph | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedClaim, setSelectedClaim] = useState<string | null>(null)

  const extractClaims = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/claims/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: documentContent,
          documentId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract claims')
      }

      setGraph(data.graph)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze document')
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'claim': return '💡'
      case 'assumption': return '🤔'
      case 'definition': return '📖'
      case 'evidence': return '📊'
      default: return '•'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'claim': return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
      case 'assumption': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
      case 'definition': return 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
      case 'evidence': return 'border-green-500 bg-green-50 dark:bg-green-900/20'
      default: return 'border-gray-300 bg-gray-50 dark:bg-gray-800'
    }
  }

  const getRelationshipColor = (rel: string) => {
    switch (rel) {
      case 'supports': return 'text-green-600 dark:text-green-400'
      case 'contradicts': return 'text-red-600 dark:text-red-400'
      case 'depends_on': return 'text-blue-600 dark:text-blue-400'
      case 'refines': return 'text-purple-600 dark:text-purple-400'
      case 'exemplifies': return 'text-orange-600 dark:text-orange-400'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getRelationshipArrow = (rel: string) => {
    switch (rel) {
      case 'supports': return '→'
      case 'contradicts': return '⊗'
      case 'depends_on': return '⟶'
      case 'refines': return '↝'
      case 'exemplifies': return '≈'
      default: return '→'
    }
  }

  // Get links for selected claim
  const selectedLinks = graph?.links.filter(
    link => link.sourceId === selectedClaim || link.targetId === selectedClaim
  ) || []

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h2 className="font-semibold text-gray-900 dark:text-white">Argument Structure</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Action Bar */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={extractClaims}
          disabled={loading}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Extract Claims & Arguments
            </>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="p-3 mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg">
            {error}
          </div>
        )}

        {!graph && !loading && !error && (
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Analyze your document to extract claims and arguments
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              AI will identify claims, assumptions, evidence, and their relationships
            </p>
          </div>
        )}

        {graph && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {graph.summary}
              </p>
            </div>

            {/* Stats */}
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                {graph.claims.filter(c => c.type === 'claim').length} claims
              </span>
              <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded">
                {graph.claims.filter(c => c.type === 'assumption').length} assumptions
              </span>
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                {graph.claims.filter(c => c.type === 'evidence').length} evidence
              </span>
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                {graph.links.length} links
              </span>
            </div>

            {/* Claims List */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Extracted Elements
              </h3>
              {graph.claims.map((claim) => (
                <div
                  key={claim.id}
                  onClick={() => setSelectedClaim(selectedClaim === claim.id ? null : claim.id)}
                  className={`p-3 border-l-4 rounded-r-lg cursor-pointer transition-all ${getTypeColor(claim.type)} ${
                    selectedClaim === claim.id ? 'ring-2 ring-orange-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{getTypeIcon(claim.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          {claim.type}
                        </span>
                        <span className="text-xs text-gray-400">
                          {Math.round(claim.confidence * 100)}% confidence
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {claim.text}
                      </p>
                    </div>
                  </div>

                  {/* Show relationships when selected */}
                  {selectedClaim === claim.id && selectedLinks.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Relationships:
                      </div>
                      {selectedLinks.map((link, i) => {
                        const isSource = link.sourceId === claim.id
                        const otherId = isSource ? link.targetId : link.sourceId
                        const otherClaim = graph.claims.find(c => c.id === otherId)

                        return (
                          <div key={i} className={`text-xs ${getRelationshipColor(link.relationship)}`}>
                            {isSource ? (
                              <>
                                {getRelationshipArrow(link.relationship)} {link.relationship} &ldquo;{otherClaim?.text.substring(0, 50)}...&rdquo;
                              </>
                            ) : (
                              <>
                                ← {link.relationship} by &ldquo;{otherClaim?.text.substring(0, 50)}...&rdquo;
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Legend
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-green-600">→</span> supports
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-red-600">⊗</span> contradicts
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-blue-600">⟶</span> depends on
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-purple-600">↝</span> refines
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
