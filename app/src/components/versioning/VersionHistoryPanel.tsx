'use client'

import { useState, useEffect } from 'react'
import { History, GitBranch, Clock, User, Eye, RotateCcw } from 'lucide-react'

interface Snapshot {
  id: string
  version_number: number
  commit_message: string | null
  content_preview: string | null
  word_count: number
  created_at: string
  creator_name?: string
  branch_name?: string
  is_main_branch?: boolean
}

interface VersionHistoryPanelProps {
  documentId: string
  branchId?: string
  onViewSnapshot?: (snapshotId: string) => void
  onRestoreSnapshot?: (snapshotId: string) => void
}

export function VersionHistoryPanel({
  documentId,
  branchId,
  onViewSnapshot,
  onRestoreSnapshot,
}: VersionHistoryPanelProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSnapshots() {
      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({ limit: '50' })
        if (branchId) {
          params.set('branch_id', branchId)
        }

        const response = await fetch(`/api/documents/${documentId}/snapshots?${params}`)
        if (!response.ok) {
          throw new Error('Failed to fetch version history')
        }

        const data = await response.json()
        setSnapshots(data.snapshots || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load version history')
      } finally {
        setIsLoading(false)
      }
    }

    if (documentId) {
      fetchSnapshots()
    }
  }, [documentId, branchId])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000)
      return `${minutes} min ago`
    }

    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000)
      return `${hours} hour${hours > 1 ? 's' : ''} ago`
    }

    // Less than 7 days
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000)
      return `${days} day${days > 1 ? 's' : ''} ago`
    }

    // Otherwise show date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full mx-auto mb-2"></div>
        Loading version history...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        {error}
      </div>
    )
  }

  if (snapshots.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="font-medium">No versions yet</p>
        <p className="text-sm mt-1">Versions will appear here when you save snapshots</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <History className="w-4 h-4" />
          Version History
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {snapshots.length} version{snapshots.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>

          {/* Versions */}
          <div className="space-y-4">
            {snapshots.map((snapshot, index) => (
              <div
                key={snapshot.id}
                className={`relative pl-8 cursor-pointer group ${
                  selectedSnapshot === snapshot.id ? 'bg-blue-50 dark:bg-blue-900/20 -mx-3 px-11 py-2 rounded' : ''
                }`}
                onClick={() => setSelectedSnapshot(snapshot.id === selectedSnapshot ? null : snapshot.id)}
              >
                {/* Timeline dot */}
                <div
                  className={`absolute left-1.5 w-3 h-3 rounded-full border-2 ${
                    index === 0
                      ? 'bg-blue-600 border-blue-600'
                      : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600'
                  }`}
                ></div>

                {/* Version card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                  {/* Version header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                          v{snapshot.version_number}
                        </span>
                        {snapshot.is_main_branch && (
                          <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                            main
                          </span>
                        )}
                        {snapshot.branch_name && !snapshot.is_main_branch && (
                          <span className="text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded flex items-center gap-1">
                            <GitBranch className="w-3 h-3" />
                            {snapshot.branch_name}
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-gray-900 dark:text-gray-100 mt-1 truncate">
                        {snapshot.commit_message || `Version ${snapshot.version_number}`}
                      </p>
                    </div>
                  </div>

                  {/* Meta info */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(snapshot.created_at)}
                    </span>
                    {snapshot.creator_name && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {snapshot.creator_name}
                      </span>
                    )}
                    <span>{snapshot.word_count} words</span>
                  </div>

                  {/* Preview (when selected) */}
                  {selectedSnapshot === snapshot.id && snapshot.content_preview && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                        {snapshot.content_preview}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onViewSnapshot?.(snapshot.id)
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onRestoreSnapshot?.(snapshot.id)
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Restore
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
