'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FileText,
  ChevronRight,
  ChevronDown,
  Plus,
  FolderOpen,
  Search,
  X
} from 'lucide-react'

interface Document {
  id: string
  title: string
  updated_at: string
  created_at: string
}

interface DocumentTreeSidebarProps {
  projectId: string
  workspaceId: string
  currentDocumentId?: string
  isOpen: boolean
  onClose: () => void
  onCreateDocument?: () => void
}

export function DocumentTreeSidebar({
  projectId,
  workspaceId,
  currentDocumentId,
  isOpen,
  onClose,
  onCreateDocument,
}: DocumentTreeSidebarProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['all']))
  const pathname = usePathname()

  useEffect(() => {
    async function fetchDocuments() {
      if (!projectId) return

      setIsLoading(true)
      try {
        const response = await fetch(`/api/documents?project_id=${projectId}`)
        if (response.ok) {
          const data = await response.json()
          setDocuments(data.documents || [])
        }
      } catch (error) {
        console.error('Failed to fetch documents:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (isOpen) {
      fetchDocuments()
    }
  }, [projectId, isOpen])

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group by recent (last 7 days) and older
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const recentDocs = filteredDocuments.filter(
    doc => new Date(doc.updated_at) > weekAgo
  )
  const olderDocs = filteredDocuments.filter(
    doc => new Date(doc.updated_at) <= weekAgo
  )

  const toggleFolder = (folder: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folder)) {
        next.delete(folder)
      } else {
        next.add(folder)
      }
      return next
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const diff = now.getTime() - date.getTime()

    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000)
      return `${minutes}m ago`
    }
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000)
      return `${hours}h ago`
    }
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000)
      return `${days}d ago`
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-40 lg:relative lg:inset-auto">
      {/* Backdrop for mobile */}
      <div
        className="absolute inset-0 bg-black/20 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col lg:relative">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            Documents
          </h2>
          <div className="flex items-center gap-1">
            {onCreateDocument && (
              <button
                onClick={onCreateDocument}
                className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                title="New document"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded lg:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8 px-4">
              <FileText className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {searchQuery ? 'No matching documents' : 'No documents yet'}
              </p>
              {!searchQuery && onCreateDocument && (
                <button
                  onClick={onCreateDocument}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  Create your first document
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Recent Documents */}
              {recentDocs.length > 0 && (
                <div className="mb-2">
                  <button
                    onClick={() => toggleFolder('recent')}
                    className="flex items-center gap-1 w-full px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    {expandedFolders.has('recent') ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                    Recent ({recentDocs.length})
                  </button>
                  {expandedFolders.has('recent') && (
                    <div className="mt-1">
                      {recentDocs.map(doc => (
                        <DocumentItem
                          key={doc.id}
                          document={doc}
                          workspaceId={workspaceId}
                          projectId={projectId}
                          isActive={doc.id === currentDocumentId}
                          formatDate={formatDate}
                          onClick={onClose}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Older Documents */}
              {olderDocs.length > 0 && (
                <div>
                  <button
                    onClick={() => toggleFolder('older')}
                    className="flex items-center gap-1 w-full px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    {expandedFolders.has('older') ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                    Older ({olderDocs.length})
                  </button>
                  {expandedFolders.has('older') && (
                    <div className="mt-1">
                      {olderDocs.map(doc => (
                        <DocumentItem
                          key={doc.id}
                          document={doc}
                          workspaceId={workspaceId}
                          projectId={projectId}
                          isActive={doc.id === currentDocumentId}
                          formatDate={formatDate}
                          onClick={onClose}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* All Documents (if no grouping needed) */}
              {recentDocs.length === 0 && olderDocs.length === 0 && (
                <div>
                  {filteredDocuments.map(doc => (
                    <DocumentItem
                      key={doc.id}
                      document={doc}
                      workspaceId={workspaceId}
                      projectId={projectId}
                      isActive={doc.id === currentDocumentId}
                      formatDate={formatDate}
                      onClick={onClose}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-gray-200 dark:border-gray-700">
          <Link
            href={`/workspace/${workspaceId}/project/${projectId}`}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            onClick={onClose}
          >
            <FolderOpen className="w-4 h-4" />
            View all in project
          </Link>
        </div>
      </aside>
    </div>
  )
}

function DocumentItem({
  document,
  workspaceId,
  projectId,
  isActive,
  formatDate,
  onClick,
}: {
  document: Document
  workspaceId: string
  projectId: string
  isActive: boolean
  formatDate: (date: string) => string
  onClick: () => void
}) {
  return (
    <Link
      href={`/documents/${document.id}`}
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 mx-2 rounded-lg transition-colors ${
        isActive
          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
      }`}
    >
      <FileText className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{document.title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          {formatDate(document.updated_at)}
        </p>
      </div>
    </Link>
  )
}
