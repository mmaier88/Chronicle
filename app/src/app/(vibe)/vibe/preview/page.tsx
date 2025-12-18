'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, RefreshCw, Sparkles, Loader2, User, MapPin, Heart } from 'lucide-react'
import { VibePreview, BookGenre } from '@/types/chronicle'

interface VibeDraft {
  genre: BookGenre
  prompt: string
  preview: VibePreview
}

export default function VibePreviewPage() {
  const router = useRouter()
  const [draft, setDraft] = useState<VibeDraft | null>(null)
  const [editedPreview, setEditedPreview] = useState<VibePreview | null>(null)
  const [isImproving, setIsImproving] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('vibe_draft')
    if (stored) {
      const parsed = JSON.parse(stored) as VibeDraft
      setDraft(parsed)
      setEditedPreview(parsed.preview)
    } else {
      router.push('/vibe/new')
    }
  }, [router])

  const handleImprove = async () => {
    if (!draft || !editedPreview) return

    setIsImproving(true)
    setError(null)

    try {
      const response = await fetch('/api/vibe/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genre: draft.genre,
          prompt: draft.prompt,
          existingPreview: editedPreview,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to improve preview')
        return
      }

      setEditedPreview(data.preview)
      // Update localStorage
      localStorage.setItem('vibe_draft', JSON.stringify({
        ...draft,
        preview: data.preview,
      }))
    } catch {
      setError('Failed to connect. Please try again.')
    } finally {
      setIsImproving(false)
    }
  }

  const handleRegenerate = async () => {
    if (!draft) return

    setIsRegenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/vibe/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genre: draft.genre,
          prompt: draft.prompt,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to regenerate preview')
        return
      }

      setEditedPreview(data.preview)
      localStorage.setItem('vibe_draft', JSON.stringify({
        ...draft,
        preview: data.preview,
      }))
    } catch {
      setError('Failed to connect. Please try again.')
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleGenerate = async () => {
    if (!draft || !editedPreview) return

    setIsCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/vibe/job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genre: draft.genre,
          prompt: draft.prompt,
          preview: editedPreview,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create job')
        setIsCreating(false)
        return
      }

      // Clear localStorage and redirect to generating page
      localStorage.removeItem('vibe_draft')
      router.push(`/vibe/generating/${data.job_id}`)
    } catch {
      setError('Failed to connect. Please try again.')
      setIsCreating(false)
    }
  }

  const updateField = (field: keyof VibePreview, value: unknown) => {
    if (!editedPreview) return
    setEditedPreview({ ...editedPreview, [field]: value })
  }

  if (!draft || !editedPreview) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.push('/vibe/new')}
        className="flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to prompt
      </button>

      <div className="space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Book Preview</h1>
          <p className="text-gray-600">
            This is the &quot;back of book&quot; preview. Edit it to your liking—no spoilers included!
          </p>
        </div>

        {/* Preview Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Title */}
          <div className="p-6 border-b border-gray-100">
            <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Title</label>
            <input
              type="text"
              value={editedPreview.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full text-2xl font-bold text-gray-900 border-0 p-0 focus:ring-0 bg-transparent"
            />
          </div>

          {/* Logline */}
          <div className="p-6 border-b border-gray-100">
            <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Logline</label>
            <input
              type="text"
              value={editedPreview.logline}
              onChange={(e) => updateField('logline', e.target.value)}
              className="w-full text-lg text-gray-700 border-0 p-0 focus:ring-0 bg-transparent"
            />
          </div>

          {/* Blurb */}
          <div className="p-6 border-b border-gray-100">
            <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Back Cover Blurb</label>
            <textarea
              value={editedPreview.blurb}
              onChange={(e) => updateField('blurb', e.target.value)}
              rows={6}
              className="w-full text-gray-700 border-0 p-0 focus:ring-0 bg-transparent resize-none leading-relaxed"
            />
          </div>

          {/* Cast */}
          <div className="p-6 border-b border-gray-100">
            <label className="block text-xs font-medium text-gray-500 uppercase mb-3">
              <User className="w-3 h-3 inline mr-1" />
              Main Cast
            </label>
            <div className="space-y-3">
              {editedPreview.cast.map((character, idx) => (
                <div key={idx} className="flex gap-3">
                  <input
                    type="text"
                    value={character.name}
                    onChange={(e) => {
                      const newCast = [...editedPreview.cast]
                      newCast[idx] = { ...newCast[idx], name: e.target.value }
                      updateField('cast', newCast)
                    }}
                    className="w-1/3 font-medium text-gray-900 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    placeholder="Name"
                  />
                  <input
                    type="text"
                    value={character.tagline}
                    onChange={(e) => {
                      const newCast = [...editedPreview.cast]
                      newCast[idx] = { ...newCast[idx], tagline: e.target.value }
                      updateField('cast', newCast)
                    }}
                    className="flex-1 text-gray-600 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    placeholder="Description"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Setting */}
          <div className="p-6 border-b border-gray-100">
            <label className="block text-xs font-medium text-gray-500 uppercase mb-2">
              <MapPin className="w-3 h-3 inline mr-1" />
              Setting
            </label>
            <textarea
              value={editedPreview.setting}
              onChange={(e) => updateField('setting', e.target.value)}
              rows={2}
              className="w-full text-gray-700 border-0 p-0 focus:ring-0 bg-transparent resize-none"
            />
          </div>

          {/* Promise */}
          <div className="p-6 border-b border-gray-100">
            <label className="block text-xs font-medium text-gray-500 uppercase mb-3">
              <Heart className="w-3 h-3 inline mr-1" />
              What to Expect
            </label>
            <div className="space-y-2">
              {editedPreview.promise.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-purple-500">•</span>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const newPromise = [...editedPreview.promise]
                      newPromise[idx] = e.target.value
                      updateField('promise', newPromise)
                    }}
                    className="flex-1 text-gray-700 border-0 p-0 focus:ring-0 bg-transparent"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Warnings */}
          <div className="p-6 bg-gray-50">
            <label className="block text-xs font-medium text-gray-500 uppercase mb-3">Content Levels</label>
            <div className="flex gap-6">
              <div>
                <span className="text-sm text-gray-600">Violence: </span>
                <select
                  value={editedPreview.warnings.violence}
                  onChange={(e) => updateField('warnings', { ...editedPreview.warnings, violence: e.target.value })}
                  className="text-sm border border-gray-200 rounded px-2 py-1"
                >
                  <option value="none">None</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <span className="text-sm text-gray-600">Romance: </span>
                <select
                  value={editedPreview.warnings.romance}
                  onChange={(e) => updateField('warnings', { ...editedPreview.warnings, romance: e.target.value })}
                  className="text-sm border border-gray-200 rounded px-2 py-1"
                >
                  <option value="none">None</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={handleImprove}
            disabled={isImproving || isRegenerating || isCreating}
            className="flex-1 py-3 border border-purple-300 text-purple-700 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-purple-50 disabled:opacity-50"
          >
            {isImproving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Improve
          </button>
          <button
            onClick={handleRegenerate}
            disabled={isImproving || isRegenerating || isCreating}
            className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-50 disabled:opacity-50"
          >
            {isRegenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Regenerate
          </button>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isImproving || isRegenerating || isCreating}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating Book...
            </>
          ) : (
            <>
              Generate My Book
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        <p className="text-center text-xs text-gray-500">
          This will generate a ~30 page book based on your preview. The process takes a few minutes.
        </p>
      </div>
    </div>
  )
}
