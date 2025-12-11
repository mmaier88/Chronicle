'use client'

import { useState, useCallback } from 'react'

export interface SearchResult {
  id: string
  type: 'document' | 'source' | 'entity' | 'section' | 'claim'
  title: string
  excerpt: string
  workspace_id: string
  workspace_name?: string
  document_id?: string
  document_title?: string
  relevance: number
  created_at: string
  metadata?: Record<string, unknown>
}

export interface SavedSearch {
  id: string
  user_id: string
  workspace_id?: string
  name: string
  query: string
  filters: Record<string, unknown>
  notify_on_new: boolean
  last_run_at?: string
  last_result_count: number
  created_at: string
}

export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  // Search
  const search = useCallback(async (options: {
    query: string
    workspace_id?: string
    types?: string[]
    limit?: number
    offset?: number
  }) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ q: options.query })
      if (options.workspace_id) params.set('workspace_id', options.workspace_id)
      if (options.types) params.set('types', options.types.join(','))
      if (options.limit) params.set('limit', options.limit.toString())
      if (options.offset) params.set('offset', options.offset.toString())

      const res = await fetch(`/api/search?${params}`)
      if (!res.ok) throw new Error('Search failed')

      const data = await res.json()
      setResults(data.results)
      setTotal(data.total)
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Clear results
  const clearResults = useCallback(() => {
    setResults([])
    setTotal(0)
  }, [])

  // Saved searches
  const getSavedSearches = useCallback(async (workspaceId?: string) => {
    const params = new URLSearchParams()
    if (workspaceId) params.set('workspace_id', workspaceId)

    const res = await fetch(`/api/search/saved?${params}`)
    if (!res.ok) throw new Error('Failed to get saved searches')

    const data = await res.json()
    return data.searches as SavedSearch[]
  }, [])

  const saveSearch = useCallback(async (options: {
    name: string
    query: string
    workspace_id?: string
    filters?: Record<string, unknown>
    notify_on_new?: boolean
  }) => {
    const res = await fetch('/api/search/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to save search')
    }

    const data = await res.json()
    return data.search as SavedSearch
  }, [])

  const deleteSavedSearch = useCallback(async (searchId: string) => {
    const res = await fetch(`/api/search/saved?id=${searchId}`, {
      method: 'DELETE',
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to delete search')
    }
  }, [])

  return {
    // State
    results,
    loading,
    error,
    total,

    // Actions
    search,
    clearResults,
    getSavedSearches,
    saveSearch,
    deleteSavedSearch,
  }
}
