'use client'

import { useState } from 'react'

interface SemanticChange {
  type: 'added' | 'removed' | 'modified' | 'strengthened' | 'weakened'
  category: 'claim' | 'argument' | 'evidence' | 'structure' | 'tone'
  description: string
  importance: 'high' | 'medium' | 'low'
  beforeText?: string
  afterText?: string
}

interface SemanticDiff {
  changes: SemanticChange[]
  summary: string
  overallAssessment: string
  claimsAdded: number
  claimsRemoved: number
  claimsModified: number
}

interface SemanticDiffPanelProps {
  beforeContent: string
  afterContent: string
  documentId?: string
  branchA?: string
  branchB?: string
  isOpen: boolean
  onClose: () => void
}

export function SemanticDiffPanel({
  beforeContent,
  afterContent,
  documentId,
  branchA = 'Previous',
  branchB = 'Current',
  isOpen,
  onClose
}: SemanticDiffPanelProps) {
  const [diff, setDiff] = useState<SemanticDiff | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedChange, setExpandedChange] = useState<number | null>(null)

  const computeDiff = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/diff/semantic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beforeContent,
          afterContent,
          documentId,
          branchA,
          branchB
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to compute diff')
      }

      setDiff(data.diff)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze changes')
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'added': return '➕'
      case 'removed': return '➖'
      case 'modified': return '✏️'
      case 'strengthened': return '💪'
      case 'weakened': return '📉'
      default: return '•'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'added': return 'border-green-500 bg-green-50 dark:bg-green-900/20'
      case 'removed': return 'border-red-500 bg-red-50 dark:bg-red-900/20'
      case 'modified': return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
      case 'strengthened': return 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
      case 'weakened': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
      default: return 'border-gray-300 bg-gray-50 dark:bg-gray-800'
    }
  }

  const getImportanceBadge = (importance: string) => {
    switch (importance) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'low': return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'claim': return '💡'
      case 'argument': return '🔗'
      case 'evidence': return '📊'
      case 'structure': return '📋'
      case 'tone': return '🎭'
      default: return '•'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <h2 className="font-semibold text-gray-900 dark:text-white">Semantic Diff</h2>
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

      {/* Branch Info */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-red-600 dark:text-red-400">● {branchA}</span>
          <span className="text-gray-400">→</span>
          <span className="text-green-600 dark:text-green-400">● {branchB}</span>
        </div>
        <button
          onClick={computeDiff}
          disabled={loading}
          className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Compare'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="p-3 mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg">
            {error}
          </div>
        )}

        {!diff && !loading && !error && (
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Compare versions to see semantic changes
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              AI analyzes changes in claims, arguments, and meaning
            </p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <svg className="w-8 h-8 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}

        {diff && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                {diff.summary}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                {diff.overallAssessment}
              </p>
            </div>

            {/* Stats */}
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                +{diff.claimsAdded} added
              </span>
              <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">
                -{diff.claimsRemoved} removed
              </span>
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                ~{diff.claimsModified} modified
              </span>
            </div>

            {/* Changes List */}
            {diff.changes.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Changes ({diff.changes.length})
                </h3>
                {diff.changes.map((change, index) => (
                  <div
                    key={index}
                    className={`p-3 border-l-4 rounded-r-lg cursor-pointer transition-all ${getTypeColor(change.type)}`}
                    onClick={() => setExpandedChange(expandedChange === index ? null : index)}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{getTypeIcon(change.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {change.type}
                          </span>
                          <span className="text-xs">{getCategoryIcon(change.category)} {change.category}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${getImportanceBadge(change.importance)}`}>
                            {change.importance}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {change.description}
                        </p>

                        {/* Expanded details */}
                        {expandedChange === index && (change.beforeText || change.afterText) && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2 text-xs">
                            {change.beforeText && (
                              <div>
                                <span className="font-medium text-red-600 dark:text-red-400">Before:</span>
                                <p className="mt-1 text-gray-600 dark:text-gray-400 italic">
                                  &ldquo;{change.beforeText}&rdquo;
                                </p>
                              </div>
                            )}
                            {change.afterText && (
                              <div>
                                <span className="font-medium text-green-600 dark:text-green-400">After:</span>
                                <p className="mt-1 text-gray-600 dark:text-gray-400 italic">
                                  &ldquo;{change.afterText}&rdquo;
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-gray-500">
                No significant semantic changes detected.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
