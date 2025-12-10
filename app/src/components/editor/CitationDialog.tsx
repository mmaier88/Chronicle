'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Source {
  id: string
  title: string
  source_type: string
  page_count: number | null
}

interface CitationDialogProps {
  isOpen: boolean
  onClose: () => void
  onInsert: (sourceId: string, pageNumber?: number) => void
  projectId?: string
}

export function CitationDialog({ isOpen, onClose, onInsert, projectId }: CitationDialogProps) {
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [pageNumber, setPageNumber] = useState<string>('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadSources()
    }
  }, [isOpen, projectId])

  const loadSources = async () => {
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('sources')
      .select('id, title, source_type, page_count')
      .order('created_at', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error loading sources:', error)
    } else {
      setSources(data || [])
    }
    setLoading(false)
  }

  const handleInsert = () => {
    if (!selectedSource) return

    const page = pageNumber ? parseInt(pageNumber, 10) : undefined
    onInsert(selectedSource, page)
    handleClose()
  }

  const handleClose = () => {
    setSelectedSource(null)
    setPageNumber('')
    setSearch('')
    onClose()
  }

  const filteredSources = sources.filter(source =>
    source.title.toLowerCase().includes(search.toLowerCase())
  )

  const selectedSourceData = sources.find(s => s.id === selectedSource)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Insert Citation
            </h2>
            <button
              onClick={handleClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sources..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Source List */}
          <div className="max-h-60 overflow-y-auto mb-4">
            {loading ? (
              <div className="text-center py-4 text-gray-500">Loading sources...</div>
            ) : filteredSources.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                {search ? 'No matching sources' : 'No sources available. Upload a PDF first.'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredSources.map((source) => (
                  <button
                    key={source.id}
                    onClick={() => setSelectedSource(source.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedSource === source.id
                        ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-500'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {source.source_type === 'pdf' ? '📄' : '📝'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {source.title}
                        </div>
                        {source.page_count && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {source.page_count} pages
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Page Number */}
          {selectedSource && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Page Number (optional)
              </label>
              <input
                type="number"
                value={pageNumber}
                onChange={(e) => setPageNumber(e.target.value)}
                placeholder={selectedSourceData?.page_count ? `1-${selectedSourceData.page_count}` : 'Page number'}
                min="1"
                max={selectedSourceData?.page_count || undefined}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleInsert}
            disabled={!selectedSource}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Insert Citation
          </button>
        </div>
      </div>
    </div>
  )
}
