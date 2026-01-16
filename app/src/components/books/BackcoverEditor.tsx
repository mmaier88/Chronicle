'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save, X, Plus } from 'lucide-react'
import { VibePreview, VibeCharacter } from '@/types/chronicle'

interface BackcoverEditorProps {
  bookId: string
}

export function BackcoverEditor({ bookId }: BackcoverEditorProps) {
  const router = useRouter()
  const [preview, setPreview] = useState<VibePreview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    async function loadPreview() {
      try {
        const response = await fetch(`/api/create/book/${bookId}/preview`)
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to load preview')
        }
        const data = await response.json()
        setPreview(data.preview)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load preview data')
      } finally {
        setIsLoading(false)
      }
    }
    loadPreview()
  }, [bookId])

  const updateField = (field: keyof VibePreview, value: unknown) => {
    if (!preview) return
    setPreview({ ...preview, [field]: value })
    setHasChanges(true)
    setSaveSuccess(false)
  }

  const handleSave = async () => {
    if (!preview) return
    setIsSaving(true)
    setError(null)
    setSaveSuccess(false)

    try {
      const response = await fetch(`/api/books/${bookId}/backcover`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preview),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save changes')
      }

      setHasChanges(false)
      setSaveSuccess(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="app-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
        <Loader2 style={{ width: 24, height: 24, animation: 'spin 1s linear infinite', color: 'var(--amber-warm)' }} />
      </div>
    )
  }

  if (error && !preview) {
    return (
      <div className="app-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <p className="app-body" style={{ color: '#fda4af' }}>{error}</p>
      </div>
    )
  }

  if (!preview) {
    return (
      <div className="app-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <p className="app-body">No backcover data available</p>
      </div>
    )
  }

  return (
    <div>
      {/* Error banner */}
      {error && (
        <div style={{
          marginBottom: '1rem',
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

      {/* Success banner */}
      {saveSuccess && (
        <div style={{
          marginBottom: '1rem',
          padding: '1rem',
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: 12,
          color: '#86efac',
          fontSize: '0.875rem'
        }}>
          Changes saved successfully
        </div>
      )}

      <div className="app-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Title */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(250, 246, 237, 0.06)' }}>
          <label className="app-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Title
          </label>
          <input
            type="text"
            value={preview.title}
            onChange={(e) => updateField('title', e.target.value)}
            disabled={isSaving}
            className="app-input"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.5rem',
              fontWeight: 500,
              background: 'transparent',
              border: 'none',
              padding: 0,
              width: '100%',
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
            value={preview.logline}
            onChange={(e) => updateField('logline', e.target.value)}
            disabled={isSaving}
            rows={2}
            className="app-textarea"
            style={{ background: 'transparent', border: 'none', padding: 0, fontSize: '1.125rem', resize: 'none', width: '100%' }}
            placeholder="One sentence hook..."
          />
        </div>

        {/* Blurb */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(250, 246, 237, 0.06)' }}>
          <label className="app-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Back cover blurb
          </label>
          <textarea
            value={preview.blurb}
            onChange={(e) => updateField('blurb', e.target.value)}
            disabled={isSaving}
            rows={5}
            className="app-textarea"
            style={{ background: 'transparent', border: 'none', padding: 0, resize: 'none', width: '100%' }}
            placeholder="The story that draws readers in..."
          />
        </div>

        {/* Cast */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(250, 246, 237, 0.06)' }}>
          <label className="app-label" style={{ display: 'block', marginBottom: '1rem' }}>
            Main cast
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {preview.cast.map((character, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <input
                  type="text"
                  value={character.name}
                  onChange={(e) => {
                    const newCast = [...preview.cast]
                    newCast[idx] = { ...newCast[idx], name: e.target.value }
                    updateField('cast', newCast)
                  }}
                  disabled={isSaving}
                  className="app-input"
                  style={{ width: '30%', fontWeight: 500, flexShrink: 0 }}
                  placeholder="Name"
                />
                <textarea
                  value={character.tagline}
                  onChange={(e) => {
                    const newCast = [...preview.cast]
                    newCast[idx] = { ...newCast[idx], tagline: e.target.value }
                    updateField('cast', newCast)
                  }}
                  disabled={isSaving}
                  rows={2}
                  className="app-textarea"
                  style={{ flex: 1, resize: 'none', minHeight: 'auto' }}
                  placeholder="Who they are..."
                />
                {preview.cast.length > 1 && (
                  <button
                    onClick={() => {
                      const newCast = preview.cast.filter((_, i) => i !== idx)
                      updateField('cast', newCast)
                    }}
                    disabled={isSaving}
                    style={{
                      padding: '0.5rem',
                      background: 'rgba(244, 63, 94, 0.1)',
                      border: '1px solid rgba(244, 63, 94, 0.2)',
                      borderRadius: 8,
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      opacity: isSaving ? 0.5 : 0.7,
                      transition: 'all 0.2s',
                      flexShrink: 0,
                      marginTop: '0.25rem',
                    }}
                    onMouseEnter={(e) => { if (!isSaving) e.currentTarget.style.opacity = '1' }}
                    onMouseLeave={(e) => { if (!isSaving) e.currentTarget.style.opacity = '0.7' }}
                    title="Remove character"
                  >
                    <X style={{ width: 14, height: 14, color: '#fda4af' }} />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => {
                const newCast: VibeCharacter[] = [...preview.cast, { name: '', tagline: '' }]
                updateField('cast', newCast)
              }}
              disabled={isSaving || preview.cast.length >= 8}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                background: 'rgba(212, 165, 116, 0.08)',
                border: '1px dashed rgba(212, 165, 116, 0.3)',
                borderRadius: 8,
                cursor: isSaving || preview.cast.length >= 8 ? 'not-allowed' : 'pointer',
                opacity: isSaving || preview.cast.length >= 8 ? 0.4 : 0.7,
                transition: 'all 0.2s',
                color: 'var(--amber-warm)',
                fontSize: '0.875rem',
                marginTop: '0.5rem',
              }}
              onMouseEnter={(e) => { if (!isSaving && preview.cast.length < 8) e.currentTarget.style.opacity = '1' }}
              onMouseLeave={(e) => { if (!isSaving && preview.cast.length < 8) e.currentTarget.style.opacity = '0.7' }}
            >
              <Plus style={{ width: 16, height: 16 }} />
              Add character
            </button>
          </div>
        </div>

        {/* Setting */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(250, 246, 237, 0.06)' }}>
          <label className="app-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Setting
          </label>
          <textarea
            value={preview.setting}
            onChange={(e) => updateField('setting', e.target.value)}
            disabled={isSaving}
            rows={2}
            className="app-textarea"
            style={{ background: 'transparent', border: 'none', padding: 0, resize: 'none', width: '100%' }}
            placeholder="Where and when..."
          />
        </div>

        {/* Promise */}
        <div style={{ padding: '1.5rem' }}>
          <label className="app-label" style={{ display: 'block', marginBottom: '1rem' }}>
            What to expect
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {preview.promise.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: 'var(--amber-warm)' }}>&#8226;</span>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const newPromise = [...preview.promise]
                    newPromise[idx] = e.target.value
                    updateField('promise', newPromise)
                  }}
                  disabled={isSaving}
                  className="app-input"
                  style={{ flex: 1, background: 'transparent', border: 'none', padding: 0 }}
                  placeholder="A promise to readers..."
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save button */}
      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="app-button-primary"
          style={{
            opacity: isSaving || !hasChanges ? 0.5 : 1,
            cursor: isSaving || !hasChanges ? 'not-allowed' : 'pointer',
          }}
        >
          {isSaving ? (
            <>
              <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
              Saving...
            </>
          ) : (
            <>
              <Save style={{ width: 16, height: 16 }} />
              Save Changes
            </>
          )}
        </button>
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
