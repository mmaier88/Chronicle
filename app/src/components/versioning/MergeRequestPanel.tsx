'use client'

import { useState, useEffect } from 'react'
import { GitMerge, GitPullRequest, Check, X, Clock, MessageSquare } from 'lucide-react'

interface MergeRequest {
  id: string
  title: string
  description: string | null
  status: 'open' | 'merged' | 'closed' | 'conflict'
  source_branch_name: string
  target_branch_name: string
  creator_name?: string
  created_at: string
  merged_at?: string
  merged_by_name?: string
  comments_count: number
}

interface MergeRequestPanelProps {
  documentId: string
  onMergeRequestSelect?: (mrId: string) => void
  onCreateMergeRequest?: () => void
}

export function MergeRequestPanel({
  documentId,
  onMergeRequestSelect,
  onCreateMergeRequest,
}: MergeRequestPanelProps) {
  const [mergeRequests, setMergeRequests] = useState<MergeRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'open' | 'merged' | 'closed' | 'all'>('open')

  useEffect(() => {
    async function fetchMergeRequests() {
      setIsLoading(true)
      try {
        const params = new URLSearchParams()
        if (filter !== 'all') {
          params.set('status', filter)
        }

        const response = await fetch(`/api/documents/${documentId}/merge-requests?${params}`)
        if (!response.ok) throw new Error('Failed to fetch merge requests')

        const data = await response.json()
        setMergeRequests(data.merge_requests || [])
      } catch (err) {
        console.error('Error fetching merge requests:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (documentId) {
      fetchMergeRequests()
    }
  }, [documentId, filter])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <GitPullRequest className="w-4 h-4 text-green-600" />
      case 'merged':
        return <GitMerge className="w-4 h-4 text-purple-600" />
      case 'closed':
        return <X className="w-4 h-4 text-red-600" />
      case 'conflict':
        return <Clock className="w-4 h-4 text-yellow-600" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'merged':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      case 'closed':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'conflict':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <GitPullRequest className="w-4 h-4" />
            Merge Requests
          </h3>
          <button
            onClick={onCreateMergeRequest}
            className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
          >
            + New
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mt-2">
          {(['open', 'merged', 'closed', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                filter === f
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full mx-auto mb-2"></div>
            Loading...
          </div>
        ) : mergeRequests.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            <GitPullRequest className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No merge requests</p>
            <p className="text-sm mt-1">
              {filter === 'all' ? 'Create a branch to start a merge request' : `No ${filter} merge requests`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {mergeRequests.map(mr => (
              <button
                key={mr.id}
                onClick={() => onMergeRequestSelect?.(mr.id)}
                className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {getStatusIcon(mr.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {mr.title}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(mr.status)}`}>
                        {mr.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="truncate">
                        {mr.source_branch_name} → {mr.target_branch_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatDate(mr.created_at)}</span>
                      {mr.creator_name && <span>by {mr.creator_name}</span>}
                      {mr.comments_count > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {mr.comments_count}
                        </span>
                      )}
                    </div>
                    {mr.status === 'merged' && mr.merged_at && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-purple-600 dark:text-purple-400">
                        <Check className="w-3 h-3" />
                        Merged {formatDate(mr.merged_at)}
                        {mr.merged_by_name && ` by ${mr.merged_by_name}`}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
