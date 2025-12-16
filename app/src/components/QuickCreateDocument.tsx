'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function QuickCreateDocument() {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    setIsCreating(true)
    setError('')

    try {
      const res = await fetch('/api/documents/quick-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // No title needed - server will generate one
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

  return (
    <div className="space-y-2">
      <button
        onClick={handleCreate}
        disabled={isCreating}
        className="w-full p-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
      >
        <div className="flex items-center justify-center gap-3">
          {isCreating ? (
            <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          )}
          <div className="text-left">
            <div className="text-xl font-semibold">
              {isCreating ? 'Creating...' : 'New Document'}
            </div>
            <div className="text-sm text-blue-100">
              {isCreating ? 'Setting up your document' : 'Click to start writing immediately'}
            </div>
          </div>
        </div>
      </button>
      {error && (
        <p className="text-red-500 text-sm text-center">{error}</p>
      )}
    </div>
  )
}
