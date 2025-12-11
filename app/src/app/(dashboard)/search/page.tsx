'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSearch, SearchResult, SavedSearch } from '@/hooks/useSearch'
import { createClient } from '@/lib/supabase/client'

const TYPE_ICONS: Record<string, string> = {
  document: '📄',
  source: '📚',
  entity: '🔗',
  section: '📝',
  claim: '💡',
}

const TYPE_COLORS: Record<string, string> = {
  document: 'bg-blue-100 text-blue-800',
  source: 'bg-purple-100 text-purple-800',
  entity: 'bg-green-100 text-green-800',
  section: 'bg-gray-100 text-gray-800',
  claim: 'bg-amber-100 text-amber-800',
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  const workspaceIdParam = searchParams.get('workspace')

  const { results, loading, total, search, clearResults, getSavedSearches, saveSearch, deleteSavedSearch } = useSearch()

  const [query, setQuery] = useState(initialQuery)
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['document', 'source', 'entity', 'section'])
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(workspaceIdParam)
  const [workspaces, setWorkspaces] = useState<Array<{ id: string; name: string }>>([])
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveName, setSaveName] = useState('')

  // Load workspaces
  useEffect(() => {
    async function loadWorkspaces() {
      const supabase = createClient()
      const { data: memberships } = await supabase
        .from('workspace_members')
        .select('workspace:workspaces(id, name)')

      if (memberships) {
        const ws: Array<{ id: string; name: string }> = []
        for (const m of memberships) {
          const workspace = m.workspace as unknown
          if (workspace && typeof workspace === 'object' && 'id' in workspace && 'name' in workspace) {
            ws.push(workspace as { id: string; name: string })
          }
        }
        setWorkspaces(ws)
      }
    }
    loadWorkspaces()
  }, [])

  // Load saved searches
  useEffect(() => {
    async function loadSaved() {
      try {
        const searches = await getSavedSearches(selectedWorkspace || undefined)
        setSavedSearches(searches)
      } catch {
        // Ignore errors
      }
    }
    loadSaved()
  }, [selectedWorkspace, getSavedSearches])

  // Run search when query params change
  useEffect(() => {
    if (initialQuery) {
      handleSearch()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery])

  const handleSearch = async () => {
    if (!query.trim()) {
      clearResults()
      return
    }

    // Update URL
    const params = new URLSearchParams()
    params.set('q', query)
    if (selectedWorkspace) params.set('workspace', selectedWorkspace)
    router.push(`/search?${params}`)

    await search({
      query: query.trim(),
      workspace_id: selectedWorkspace || undefined,
      types: selectedTypes,
      limit: 50,
    })
  }

  const handleSaveSearch = async () => {
    if (!saveName.trim() || !query.trim()) return

    try {
      const saved = await saveSearch({
        name: saveName,
        query: query.trim(),
        workspace_id: selectedWorkspace || undefined,
        filters: { types: selectedTypes },
      })
      setSavedSearches([saved, ...savedSearches])
      setShowSaveDialog(false)
      setSaveName('')
    } catch (err) {
      console.error('Save search error:', err)
    }
  }

  const handleLoadSaved = (saved: SavedSearch) => {
    setQuery(saved.query)
    if (saved.filters?.types) {
      setSelectedTypes(saved.filters.types as string[])
    }
    if (saved.workspace_id) {
      setSelectedWorkspace(saved.workspace_id)
    }
    search({
      query: saved.query,
      workspace_id: saved.workspace_id || undefined,
      types: (saved.filters?.types as string[]) || selectedTypes,
    })
  }

  const handleDeleteSaved = async (searchId: string) => {
    try {
      await deleteSavedSearch(searchId)
      setSavedSearches(savedSearches.filter(s => s.id !== searchId))
    } catch (err) {
      console.error('Delete saved search error:', err)
    }
  }

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const getResultLink = (result: SearchResult) => {
    switch (result.type) {
      case 'document':
        return `/documents/${result.id}`
      case 'section':
        return result.document_id ? `/documents/${result.document_id}` : '#'
      case 'source':
        return `/sources?highlight=${result.id}`
      case 'entity':
      case 'claim':
        return `/knowledge?entity=${result.id}&workspace=${result.workspace_id}`
      default:
        return '#'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold mb-4">Search</h1>

          {/* Search input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search documents, sources, entities..."
              className="flex-1 border rounded-lg px-4 py-2"
              autoFocus
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Filters */}
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <div className="flex gap-2">
              {['document', 'source', 'entity', 'section', 'claim'].map(type => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedTypes.includes(type)
                      ? TYPE_COLORS[type]
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {TYPE_ICONS[type]} {type}
                </button>
              ))}
            </div>

            <select
              value={selectedWorkspace || ''}
              onChange={e => setSelectedWorkspace(e.target.value || null)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">All workspaces</option>
              {workspaces.map(ws => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>

            {query.trim() && (
              <button
                onClick={() => setShowSaveDialog(true)}
                className="text-sm text-blue-600 hover:underline"
              >
                Save search
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 flex gap-6">
        {/* Results */}
        <div className="flex-1">
          {results.length > 0 && (
            <p className="text-sm text-gray-500 mb-4">
              {total} result{total !== 1 ? 's' : ''} for &quot;{query}&quot;
            </p>
          )}

          {results.length === 0 && query && !loading && (
            <div className="text-center py-12 text-gray-500">
              <p>No results found for &quot;{query}&quot;</p>
              <p className="text-sm mt-2">Try adjusting your search or filters</p>
            </div>
          )}

          <div className="space-y-4">
            {results.map(result => (
              <Link
                key={`${result.type}-${result.id}`}
                href={getResultLink(result)}
                className="block p-4 bg-white dark:bg-gray-800 rounded-lg border hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">{TYPE_ICONS[result.type]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs ${TYPE_COLORS[result.type]}`}>
                        {result.type}
                      </span>
                      {result.workspace_name && (
                        <span className="text-xs text-gray-400">{result.workspace_name}</span>
                      )}
                    </div>
                    <h3 className="font-medium truncate">{result.title}</h3>
                    {result.excerpt && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {result.excerpt}
                      </p>
                    )}
                    {result.document_title && (
                      <p className="text-xs text-gray-400 mt-1">
                        in {result.document_title}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Saved searches sidebar */}
        {savedSearches.length > 0 && (
          <div className="w-64 hidden lg:block">
            <h3 className="font-medium mb-3">Saved Searches</h3>
            <div className="space-y-2">
              {savedSearches.map(saved => (
                <div
                  key={saved.id}
                  className="p-2 bg-white dark:bg-gray-800 rounded border text-sm"
                >
                  <button
                    onClick={() => handleLoadSaved(saved)}
                    className="font-medium hover:text-blue-600 block w-full text-left"
                  >
                    {saved.name}
                  </button>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-400 truncate">{saved.query}</span>
                    <button
                      onClick={() => handleDeleteSaved(saved.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
            <h3 className="font-semibold mb-4">Save Search</h3>
            <input
              type="text"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              placeholder="Search name"
              className="w-full border rounded px-3 py-2 mb-4"
              autoFocus
            />
            <p className="text-sm text-gray-500 mb-4">
              Query: {query}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSearch}
                disabled={!saveName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
