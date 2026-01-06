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
      router.push('/create/new')
    }
  }, [router])

  const handleImprove = async () => {
    if (!draft || !editedPreview) return

    setIsImproving(true)
    setError(null)

    try {
      const response = await fetch('/api/create/preview', {
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
      const response = await fetch('/api/create/preview', {
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
      const response = await fetch('/api/create/job', {
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
      router.push(`/create/generating/${data.job_id}`)
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <Loader2 style={{ width: 24, height: 24, animation: 'spin 1s linear infinite', color: 'var(--amber-warm)' }} />
      </div>
    )
  }

  const isWorking = isImproving || isRegenerating || isCreating

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 className="app-heading-1" style={{ marginBottom: '0.75rem' }}>
          Your back cover
        </h1>
        <p className="app-body" style={{ opacity: 0.7 }}>
          Make it sound like a book you&apos;d actually pick up. No spoilers here.
        </p>
      </div>

      {/* Preview Card */}
      <div className="app-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Title */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(250, 246, 237, 0.06)' }}>
          <label className="app-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Title
          </label>
          <input
            type="text"
            value={editedPreview.title}
            onChange={(e) => updateField('title', e.target.value)}
            disabled={isWorking}
            className="app-input"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.5rem',
              fontWeight: 500,
              background: 'transparent',
              border: 'none',
              padding: 0,
            }}
            placeholder="Your title..."
          />
        </div>

        {/* Logline */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(250, 246, 237, 0.06)' }}>
          <label className="app-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Logline
          </label>
          <textarea
            value={editedPreview.logline}
            onChange={(e) => updateField('logline', e.target.value)}
            disabled={isWorking}
            rows={2}
            className="app-textarea"
            style={{ background: 'transparent', border: 'none', padding: 0, fontSize: '1.125rem', resize: 'none' }}
            placeholder="One sentence hook..."
          />
        </div>

        {/* Blurb */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(250, 246, 237, 0.06)' }}>
          <label className="app-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Back cover blurb
          </label>
          <textarea
            value={editedPreview.blurb}
            onChange={(e) => updateField('blurb', e.target.value)}
            disabled={isWorking}
            rows={5}
            className="app-textarea"
            style={{ background: 'transparent', border: 'none', padding: 0, resize: 'none' }}
            placeholder="The story that draws readers in..."
          />
        </div>

        {/* Cast */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(250, 246, 237, 0.06)' }}>
          <label className="app-label" style={{ display: 'block', marginBottom: '1rem' }}>
            Main cast
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {editedPreview.cast.map((character, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <input
                  type="text"
                  value={character.name}
                  onChange={(e) => {
                    const newCast = [...editedPreview.cast]
                    newCast[idx] = { ...newCast[idx], name: e.target.value }
                    updateField('cast', newCast)
                  }}
                  disabled={isWorking}
                  className="app-input"
                  style={{ width: '30%', fontWeight: 500, flexShrink: 0 }}
                  placeholder="Name"
                />
                <textarea
                  value={character.tagline}
                  onChange={(e) => {
                    const newCast = [...editedPreview.cast]
                    newCast[idx] = { ...newCast[idx], tagline: e.target.value }
                    updateField('cast', newCast)
                  }}
                  disabled={isWorking}
                  rows={2}
                  className="app-textarea"
                  style={{ flex: 1, resize: 'none', minHeight: 'auto' }}
                  placeholder="Who they are..."
                />
              </div>
            ))}
          </div>
        </div>

        {/* Setting */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(250, 246, 237, 0.06)' }}>
          <label className="app-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Setting
          </label>
          <textarea
            value={editedPreview.setting}
            onChange={(e) => updateField('setting', e.target.value)}
            disabled={isWorking}
            rows={2}
            className="app-textarea"
            style={{ background: 'transparent', border: 'none', padding: 0, resize: 'none' }}
            placeholder="Where and when..."
          />
        </div>

        {/* Promise */}
        <div style={{ padding: '1.5rem' }}>
          <label className="app-label" style={{ display: 'block', marginBottom: '1rem' }}>
            What to expect
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {editedPreview.promise.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: 'var(--amber-warm)' }}>•</span>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const newPromise = [...editedPreview.promise]
                    newPromise[idx] = e.target.value
                    updateField('promise', newPromise)
                  }}
                  disabled={isWorking}
                  className="app-input"
                  style={{ flex: 1, background: 'transparent', border: 'none', padding: 0 }}
                  placeholder="A promise to readers..."
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          background: 'rgba(244, 63, 94, 0.1)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: 12,
          color: '#fda4af',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}

      {/* Actions */}
      <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Secondary actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleImprove}
            disabled={isWorking}
            className="app-button-secondary"
            style={{
              flex: 1,
              justifyContent: 'center',
              padding: '0.875rem 1.25rem',
              opacity: isWorking ? 0.5 : 1,
              cursor: isWorking ? 'not-allowed' : 'pointer',
            }}
          >
            {isImproving ? (
              <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
            ) : (
              <Wand2 style={{ width: 16, height: 16 }} />
            )}
            Improve wording
          </button>
          <button
            onClick={handleRegenerate}
            disabled={isWorking}
            className="app-button-secondary"
            style={{
              flex: 1,
              justifyContent: 'center',
              padding: '0.875rem 1.25rem',
              opacity: isWorking ? 0.5 : 1,
              cursor: isWorking ? 'not-allowed' : 'pointer',
            }}
          >
            {isRegenerating ? (
              <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
            ) : (
              <RefreshCw style={{ width: 16, height: 16 }} />
            )}
            Try another
          </button>
        </div>

        {/* Primary CTA */}
        <button
          onClick={handleGenerate}
          disabled={isWorking}
          className="app-button-primary"
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '1.125rem 2rem',
            fontSize: '1.125rem',
            opacity: isWorking ? 0.5 : 1,
            cursor: isWorking ? 'not-allowed' : 'pointer',
          }}
        >
          {isCreating ? (
            <>
              <Loader2 style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }} />
              Setting things in motion...
            </>
          ) : (
            <>
              <Sparkles style={{ width: 20, height: 20 }} />
              Generate my book
            </>
          )}
        </button>

        <p className="app-body-sm" style={{ textAlign: 'center' }}>
          This will create a ~{draft.length || 30} page book. {(draft.length || 30) >= 120 ? 'This may take a while.' : 'Takes a few minutes.'}
        </p>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
