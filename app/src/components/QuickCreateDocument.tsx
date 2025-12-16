'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function QuickCreateDocument() {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [showInput, setShowInput] = useState(false)
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('Please enter a title')
      return
    }

    setIsCreating(true)
    setError('')

    try {
      const res = await fetch('/api/documents/quick-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create document')
      }

      // Redirect to the new document
      router.push(`/documents/${data.document.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsCreating(false)
    }
  }

  if (!showInput) {
    return (
      <button
        onClick={() => setShowInput(true)}
        className="w-full p-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl text-white shadow-lg transition-all hover:shadow-xl"
      >
        <div className="flex items-center justify-center gap-3">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <div className="text-left">
            <div className="text-xl font-semibold">New Document</div>
            <div className="text-sm text-blue-100">Start writing immediately</div>
          </div>
        </div>
      </button>
    )
  }

  return (
    <div className="w-full p-6 bg-white dark:bg-gray-800 rounded-xl border-2 border-blue-500 shadow-lg">
      <div className="space-y-4">
        <div>
          <label htmlFor="quick-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Document Title
          </label>
          <input
            type="text"
            id="quick-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="My Research Document"
            autoFocus
            className="w-full px-4 py-3 text-lg border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isCreating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating...
              </span>
            ) : (
              'Create & Open'
            )}
          </button>
          <button
            onClick={() => {
              setShowInput(false)
              setTitle('')
              setError('')
            }}
            disabled={isCreating}
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
