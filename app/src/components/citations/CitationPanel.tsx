'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Citation {
  id: string
  text: string
  sourceId: string
  sourceTitle: string
  pageNumber?: number
  verification?: {
    status: 'pending' | 'supported' | 'contradicted' | 'partial' | 'unverifiable'
    confidence: number
    explanation: string
  }
}

interface CitationPanelProps {
  citations: Citation[]
  documentId?: string
  isOpen: boolean
  onClose: () => void
  onVerify: (citation: Citation) => void
  onJumpTo: (citation: Citation) => void
}

export function CitationPanel({
  citations,
  documentId,
  isOpen,
  onClose,
  onVerify,
  onJumpTo
}: CitationPanelProps) {
  const [verifying, setVerifying] = useState<string | null>(null)
  const [localCitations, setLocalCitations] = useState<Citation[]>(citations)

  useEffect(() => {
    setLocalCitations(citations)
  }, [citations])

  const handleVerify = async (citation: Citation) => {
    setVerifying(citation.id)

    try {
      const response = await fetch('/api/citations/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citedText: citation.text,
          sourceId: citation.sourceId,
          documentId
        })
      })

      const data = await response.json()

      if (response.ok && data.verification) {
        // Update local state
        setLocalCitations(prev =>
          prev.map(c =>
            c.id === citation.id
              ? { ...c, verification: data.verification }
              : c
          )
        )
        onVerify({ ...citation, verification: data.verification })
      }
    } catch (error) {
      console.error('Verification error:', error)
    } finally {
      setVerifying(null)
    }
  }

  const handleVerifyAll = async () => {
    for (const citation of localCitations) {
      if (!citation.verification || citation.verification.status === 'pending') {
        await handleVerify(citation)
      }
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'supported':
        return <span className="text-green-500">✓</span>
      case 'contradicted':
        return <span className="text-red-500">✗</span>
      case 'partial':
        return <span className="text-yellow-500">◐</span>
      case 'unverifiable':
        return <span className="text-gray-400">?</span>
      default:
        return <span className="text-gray-300">○</span>
    }
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'supported':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'contradicted':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'unverifiable':
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
      default:
        return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
    }
  }

  // Stats
  const stats = {
    total: localCitations.length,
    verified: localCitations.filter(c => c.verification && c.verification.status !== 'pending').length,
    supported: localCitations.filter(c => c.verification?.status === 'supported').length,
    contradicted: localCitations.filter(c => c.verification?.status === 'contradicted').length
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 className="font-semibold text-gray-900 dark:text-white">Citations</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({stats.total})
          </span>
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

      {/* Stats Bar */}
      {localCitations.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <span className="text-gray-500 dark:text-gray-400">
                {stats.verified}/{stats.total} verified
              </span>
              {stats.supported > 0 && (
                <span className="text-green-600 dark:text-green-400">
                  {stats.supported} ✓
                </span>
              )}
              {stats.contradicted > 0 && (
                <span className="text-red-600 dark:text-red-400">
                  {stats.contradicted} ✗
                </span>
              )}
            </div>
            <button
              onClick={handleVerifyAll}
              disabled={verifying !== null}
              className="text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
            >
              Verify All
            </button>
          </div>
        </div>
      )}

      {/* Citation List */}
      <div className="flex-1 overflow-y-auto p-4">
        {localCitations.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              No citations in this document
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Select text and click the citation button to add citations
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {localCitations.map((citation) => (
              <div
                key={citation.id}
                className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-lg">{getStatusIcon(citation.verification?.status)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                      &ldquo;{citation.text}&rdquo;
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                  <span className="truncate">{citation.sourceTitle}</span>
                  {citation.pageNumber && (
                    <span>p. {citation.pageNumber}</span>
                  )}
                </div>

                {citation.verification && citation.verification.status !== 'pending' && (
                  <div className="mb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(citation.verification.status)}`}>
                      {citation.verification.status}
                      {citation.verification.confidence > 0 && (
                        <span className="ml-1 opacity-75">
                          ({Math.round(citation.verification.confidence * 100)}%)
                        </span>
                      )}
                    </span>
                    {citation.verification.explanation && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {citation.verification.explanation}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onJumpTo(citation)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Jump to
                  </button>
                  <button
                    onClick={() => handleVerify(citation)}
                    disabled={verifying === citation.id}
                    className="text-xs text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-50"
                  >
                    {verifying === citation.id ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
