'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, RefreshCw, Loader2, Wand2 } from 'lucide-react'
import { VibePreview, BookGenre } from '@/types/chronicle'

type BookLength = 30 | 60 | 120 | 300

interface VibeDraft {
  genre: BookGenre
  prompt: string
  preview: VibePreview
  length?: BookLength
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
        setError(data.error || 'Something went sideways')
        return
      }

      setEditedPreview(data.preview)
      localStorage.setItem('vibe_draft', JSON.stringify({
        ...draft,
        preview: data.preview,
      }))
    } catch {
      setError('Couldn\'t connect. Let\'s try again.')
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
        setError(data.error || 'Something went sideways')
        return
      }

      setEditedPreview(data.preview)
      localStorage.setItem('vibe_draft', JSON.stringify({
        ...draft,
        preview: data.preview,
      }))
    } catch {
      setError('Couldn\'t connect. Let\'s try again.')
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
          length: draft.length || 30,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Something went sideways')
        setIsCreating(false)
        return
      }

      localStorage.removeItem('vibe_draft')
      router.push(`/vibe/generating/${data.job_id}`)
    } catch {
      setError('Couldn\'t connect. Let\'s try again.')
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
        <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
      </div>
    )
  }

  const isWorking = isImproving || isRegenerating || isCreating

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-serif text-3xl md:text-4xl text-amber-950 tracking-tight mb-3">
          Your back cover
        </h1>
        <p className="text-amber-700/70 text-lg">
          Make it sound like a book you&apos;d actually pick up. No spoilers here.
        </p>
      </div>

      {/* Preview Card */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-amber-100 shadow-xl shadow-amber-100/30 overflow-hidden">
        {/* Title */}
        <div className="p-6 border-b border-amber-50">
          <label className="block text-xs font-medium text-amber-500 uppercase tracking-wide mb-2">
            Title
          </label>
          <input
            type="text"
            value={editedPreview.title}
            onChange={(e) => updateField('title', e.target.value)}
            disabled={isWorking}
            className="w-full font-serif text-2xl md:text-3xl text-amber-950 border-0 p-0 bg-transparent focus:ring-0 focus:outline-none placeholder:text-amber-300"
            placeholder="Your title..."
          />
        </div>

        {/* Logline */}
        <div className="p-6 border-b border-amber-50">
          <label className="block text-xs font-medium text-amber-500 uppercase tracking-wide mb-2">
            Logline
          </label>
          <input
            type="text"
            value={editedPreview.logline}
            onChange={(e) => updateField('logline', e.target.value)}
            disabled={isWorking}
            className="w-full text-lg text-amber-800 border-0 p-0 bg-transparent focus:ring-0 focus:outline-none placeholder:text-amber-300"
            placeholder="One sentence hook..."
          />
        </div>

        {/* Blurb */}
        <div className="p-6 border-b border-amber-50">
          <label className="block text-xs font-medium text-amber-500 uppercase tracking-wide mb-2">
            Back cover blurb
          </label>
          <textarea
            value={editedPreview.blurb}
            onChange={(e) => updateField('blurb', e.target.value)}
            disabled={isWorking}
            rows={5}
            className="w-full text-amber-800 leading-relaxed border-0 p-0 bg-transparent focus:ring-0 focus:outline-none resize-none placeholder:text-amber-300"
            placeholder="The story that draws readers in..."
          />
        </div>

        {/* Cast */}
        <div className="p-6 border-b border-amber-50">
          <label className="block text-xs font-medium text-amber-500 uppercase tracking-wide mb-4">
            ✨ Main cast
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
                  disabled={isWorking}
                  className="w-1/3 font-medium text-amber-950 bg-amber-50/50 border border-amber-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-300"
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
                  disabled={isWorking}
                  className="flex-1 text-amber-700 bg-amber-50/50 border border-amber-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-300"
                  placeholder="Who they are..."
                />
              </div>
            ))}
          </div>
        </div>

        {/* Setting */}
        <div className="p-6 border-b border-amber-50">
          <label className="block text-xs font-medium text-amber-500 uppercase tracking-wide mb-2">
            🌍 Setting
          </label>
          <textarea
            value={editedPreview.setting}
            onChange={(e) => updateField('setting', e.target.value)}
            disabled={isWorking}
            rows={2}
            className="w-full text-amber-800 border-0 p-0 bg-transparent focus:ring-0 focus:outline-none resize-none placeholder:text-amber-300"
            placeholder="Where and when..."
          />
        </div>

        {/* Promise */}
        <div className="p-6">
          <label className="block text-xs font-medium text-amber-500 uppercase tracking-wide mb-4">
            💫 What to expect
          </label>
          <div className="space-y-2">
            {editedPreview.promise.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-amber-400">•</span>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const newPromise = [...editedPreview.promise]
                    newPromise[idx] = e.target.value
                    updateField('promise', newPromise)
                  }}
                  disabled={isWorking}
                  className="flex-1 text-amber-800 border-0 p-0 bg-transparent focus:ring-0 focus:outline-none placeholder:text-amber-300"
                  placeholder="A promise to readers..."
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 space-y-4">
        {/* Secondary actions */}
        <div className="flex gap-3">
          <button
            onClick={handleImprove}
            disabled={isWorking}
            className="flex-1 py-3 bg-white border border-amber-200 text-amber-700 rounded-full font-medium flex items-center justify-center gap-2 hover:bg-amber-50 hover:border-amber-300 disabled:opacity-50 transition-all duration-200"
          >
            {isImproving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
            Improve wording
          </button>
          <button
            onClick={handleRegenerate}
            disabled={isWorking}
            className="flex-1 py-3 bg-white border border-amber-200 text-amber-700 rounded-full font-medium flex items-center justify-center gap-2 hover:bg-amber-50 hover:border-amber-300 disabled:opacity-50 transition-all duration-200"
          >
            {isRegenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Try another
          </button>
        </div>

        {/* Primary CTA */}
        <button
          onClick={handleGenerate}
          disabled={isWorking}
          className="w-full py-4 bg-gradient-to-r from-amber-600 to-rose-500 text-white rounded-full font-medium text-lg flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 hover:shadow-xl hover:shadow-amber-500/30 hover:scale-[1.01] transition-all duration-200"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Setting things in motion...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate my book
            </>
          )}
        </button>

        <p className="text-center text-sm text-amber-500">
          This will create a ~{draft.length || 30} page book. {(draft.length || 30) >= 120 ? 'This may take a while.' : 'Takes a few minutes.'}
        </p>
      </div>
    </div>
  )
}
