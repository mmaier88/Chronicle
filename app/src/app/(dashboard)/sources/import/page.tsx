'use client'

import { useState } from 'react'
import Link from 'next/link'

type ImportTab = 'arxiv' | 'doi' | 'bibtex' | 'web'

interface ImportResult {
  success: boolean
  message: string
  source?: { id: string; title: string }
}

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<ImportTab>('arxiv')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')

  // ArXiv state
  const [arxivId, setArxivId] = useState('')
  const [arxivSearch, setArxivSearch] = useState('')
  const [arxivResults, setArxivResults] = useState<Array<{
    arxiv_id: string
    title: string
    authors: string[]
    abstract: string
    published: string
  }>>([])

  // DOI state
  const [doi, setDoi] = useState('')

  // BibTeX state
  const [bibtex, setBibtex] = useState('')
  const [bibtexResults, setBibtexResults] = useState<{
    imported: number
    skipped: number
    failed: number
  } | null>(null)

  // Web state
  const [webUrl, setWebUrl] = useState('')

  const handleArxivSearch = async () => {
    if (!arxivSearch.trim()) return
    setLoading(true)
    setError('')
    setArxivResults([])

    try {
      const res = await fetch(`/api/import/arxiv?query=${encodeURIComponent(arxivSearch)}&max_results=10`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)
      setArxivResults(data.results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleArxivImport = async (id?: string) => {
    const importId = id || arxivId.trim()
    if (!importId) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/import/arxiv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arxiv_id: importId }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setResult({
        success: true,
        message: data.message,
        source: data.source,
      })
      setArxivId('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDoiImport = async () => {
    if (!doi.trim()) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/import/doi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doi: doi.trim() }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setResult({
        success: true,
        message: data.message,
        source: data.source,
      })
      setDoi('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  const handleBibtexImport = async () => {
    if (!bibtex.trim()) return

    setLoading(true)
    setError('')
    setBibtexResults(null)

    try {
      const res = await fetch('/api/import/bibtex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bibtex: bibtex.trim() }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setBibtexResults({
        imported: data.imported,
        skipped: data.skipped,
        failed: data.failed,
      })

      if (data.imported > 0) {
        setBibtex('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  const handleWebImport = async () => {
    if (!webUrl.trim()) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/import/web', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webUrl.trim() }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setResult({
        success: true,
        message: data.message,
        source: data.source,
      })
      setWebUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  const tabs: { id: ImportTab; label: string; icon: string }[] = [
    { id: 'arxiv', label: 'ArXiv', icon: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z' },
    { id: 'doi', label: 'DOI', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
    { id: 'bibtex', label: 'BibTeX', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'web', label: 'Web Article', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
        <Link href="/sources" className="hover:text-gray-700 dark:hover:text-gray-200">
          Sources
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-white">Import</span>
      </div>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Import Sources
        </h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setError('')
                setResult(null)
              }}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400">
          {result.message}
          {result.source && (
            <Link
              href={`/sources/${result.source.id}`}
              className="ml-2 underline hover:no-underline"
            >
              View source
            </Link>
          )}
        </div>
      )}

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {/* ArXiv Tab */}
        {activeTab === 'arxiv' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Import from ArXiv
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Import papers directly from ArXiv by ID or search.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ArXiv ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={arxivId}
                    onChange={(e) => setArxivId(e.target.value)}
                    placeholder="e.g., 2301.12345 or https://arxiv.org/abs/2301.12345"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={() => handleArxivImport()}
                    disabled={loading || !arxivId.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Import
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Or search ArXiv
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={arxivSearch}
                    onChange={(e) => setArxivSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleArxivSearch()}
                    placeholder="Search for papers..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={handleArxivSearch}
                    disabled={loading || !arxivSearch.trim()}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                  >
                    Search
                  </button>
                </div>
              </div>

              {arxivResults.length > 0 && (
                <div className="space-y-3 mt-4">
                  {arxivResults.map((paper) => (
                    <div
                      key={paper.arxiv_id}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {paper.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {paper.authors.slice(0, 3).join(', ')}
                        {paper.authors.length > 3 && ` +${paper.authors.length - 3} more`}
                      </p>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {paper.abstract}
                      </p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-400">
                          {new Date(paper.published).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => handleArxivImport(paper.arxiv_id)}
                          disabled={loading}
                          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          Import
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* DOI Tab */}
        {activeTab === 'doi' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Import by DOI
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Import any paper with a DOI from CrossRef.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                DOI
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={doi}
                  onChange={(e) => setDoi(e.target.value)}
                  placeholder="e.g., 10.1038/nature12373 or https://doi.org/10.1038/nature12373"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
                <button
                  onClick={handleDoiImport}
                  disabled={loading || !doi.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Import
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BibTeX Tab */}
        {activeTab === 'bibtex' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Import from BibTeX
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Paste your BibTeX entries to import multiple sources at once.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                BibTeX Content
              </label>
              <textarea
                value={bibtex}
                onChange={(e) => setBibtex(e.target.value)}
                rows={12}
                placeholder={`@article{example2024,
  title={Example Paper Title},
  author={Smith, John and Doe, Jane},
  journal={Nature},
  year={2024},
  doi={10.1038/example}
}`}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm"
              />
              <button
                onClick={handleBibtexImport}
                disabled={loading || !bibtex.trim()}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Import All Entries
              </button>
            </div>

            {bibtexResults && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Import Results</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{bibtexResults.imported}</div>
                    <div className="text-sm text-gray-500">Imported</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">{bibtexResults.skipped}</div>
                    <div className="text-sm text-gray-500">Skipped</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{bibtexResults.failed}</div>
                    <div className="text-sm text-gray-500">Failed</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Web Tab */}
        {activeTab === 'web' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Import Web Article
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Import any web article by URL. Content will be extracted automatically.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Article URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={webUrl}
                  onChange={(e) => setWebUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
                <button
                  onClick={handleWebImport}
                  disabled={loading || !webUrl.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Import
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
    </div>
  )
}
