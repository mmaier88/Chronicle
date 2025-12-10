'use client'

import { useState } from 'react'

interface Evidence {
  id: string
  content: string
  sourceId: string
  sourceTitle: string
  chunkIndex: number
  similarity: number
  pageNumber?: number
}

interface EvidencePanelProps {
  projectId?: string
  selectedText?: string
  isOpen: boolean
  onClose: () => void
  onInsertCitation?: (evidence: Evidence) => void
}

export function EvidencePanel({ projectId, selectedText, isOpen, onClose, onInsertCitation }: EvidencePanelProps) {
  const [query, setQuery] = useState(selectedText || '')
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const searchEvidence = async () => {
    if (!query.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/evidence/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          projectId,
          limit: 8,
          threshold: 0.3
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Search failed')
      }

      setEvidence(data.evidence || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.8) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
    if (similarity >= 0.6) return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
    if (similarity >= 0.4) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
    return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800'
  }

  const getSimilarityLabel = (similarity: number) => {
    if (similarity >= 0.8) return 'Strong match'
    if (similarity >= 0.6) return 'Good match'
    if (similarity >= 0.4) return 'Partial match'
    return 'Weak match'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 w-[520px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h2 className="font-semibold text-gray-900 dark:text-white">Find Evidence</h2>
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

      {/* Search Box */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchEvidence()}
            placeholder="Enter a claim or query to find supporting evidence..."
            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            onClick={searchEvidence}
            disabled={loading || !query.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
            Search
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Search your uploaded sources for evidence that supports or relates to your claim
        </p>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="p-3 mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg">
            {error}
          </div>
        )}

        {!loading && evidence.length === 0 && !error && (
          <div className="text-center py-12">
            <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Enter a claim or query to find supporting evidence from your sources
            </p>
          </div>
        )}

        {evidence.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {evidence.length} result{evidence.length !== 1 ? 's' : ''} found
              </span>
            </div>

            {evidence.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                      {item.sourceTitle}
                    </span>
                    {item.pageNumber && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        p. {item.pageNumber}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${getSimilarityColor(item.similarity)}`}>
                    {Math.round(item.similarity * 100)}% - {getSimilarityLabel(item.similarity)}
                  </span>
                </div>

                {/* Content */}
                <p
                  className={`text-sm text-gray-600 dark:text-gray-400 ${
                    expandedId === item.id ? '' : 'line-clamp-3'
                  }`}
                >
                  {item.content}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    {expandedId === item.id ? 'Show less' : 'Show more'}
                  </button>
                  {onInsertCitation && (
                    <button
                      onClick={() => onInsertCitation(item)}
                      className="ml-auto px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
                    >
                      Cite this
                    </button>
                  )}
                  <button
                    onClick={() => navigator.clipboard.writeText(item.content)}
                    className="px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          Tips
        </h4>
        <ul className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
          <li>• Use specific claims for better results</li>
          <li>• Higher match percentages indicate stronger relevance</li>
          <li>• Click "Cite this" to add as a citation in your document</li>
        </ul>
      </div>
    </div>
  )
}
