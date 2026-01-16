'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, X, Plus, RefreshCw, Info, ChevronDown } from 'lucide-react'
import { VibePreview, BookGenre, StorySliders, DEFAULT_SLIDERS, Constitution } from '@/types/chronicle'
import { StorySliders as StorySlidersComponent } from '@/components/create/StorySliders'

interface SourceBookPreview {
  preview: VibePreview
  constitution: Constitution
  sliders: StorySliders
  chapters: Array<{ index: number; title: string }>
  genre: BookGenre
  prompt: string
  targetPages: number
  mode: string
}

type BookLength = 30 | 60 | 120 | 300

export default function RegeneratePage({
  params,
}: {
  params: Promise<{ bookId: string }>
}) {
  const { bookId } = use(params)
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sourceData, setSourceData] = useState<SourceBookPreview | null>(null)

  // Editable state
  const [editedPreview, setEditedPreview] = useState<VibePreview | null>(null)
  const [sliders, setSliders] = useState<StorySliders>(DEFAULT_SLIDERS)
  const [constitution, setConstitution] = useState<Constitution | null>(null)
  const [showAdvancedSliders, setShowAdvancedSliders] = useState(false)
  const [showConstitution, setShowConstitution] = useState(false)

  // Regeneration options
  const [regenScope, setRegenScope] = useState<'full' | 'from_chapter'>('full')
  const [fromChapterIndex, setFromChapterIndex] = useState<number>(0)

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch source book data
  useEffect(() => {
    async function fetchSourceBook() {
      try {
        const response = await fetch(`/api/create/book/${bookId}/preview`)
        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Failed to load book data')
          setLoading(false)
          return
        }

        setSourceData(data)
        setEditedPreview(data.preview)
        setSliders(data.sliders || DEFAULT_SLIDERS)
        setConstitution(data.constitution)
        setLoading(false)
      } catch {
        setError('Failed to connect to server')
        setLoading(false)
      }
    }

    fetchSourceBook()
  }, [bookId])

  const handleBack = () => {
    router.push(`/create/read/${bookId}`)
  }

  const handleSubmit = async () => {
    if (!sourceData || !editedPreview || !constitution) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/create/job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genre: sourceData.genre,
          prompt: sourceData.prompt,
          preview: editedPreview,
          length: (sourceData.targetPages || 30) as BookLength,
          mode: sourceData.mode || 'draft',
          sliders: sliders,
          sourceBookId: bookId,
          sourceChapterIndex: regenScope === 'from_chapter' ? fromChapterIndex : null,
          constitution: constitution,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.details
          ? `${data.error}: ${data.details}`
          : (data.error || 'Failed to create regeneration job')
        setError(errorMsg)
        setIsSubmitting(false)
        return
      }

      // Redirect to generating page
      router.push(`/create/generating/${data.job_id}`)
    } catch {
      setError('Failed to connect to server')
      setIsSubmitting(false)
    }
  }

  const updatePreviewField = (field: keyof VibePreview, value: unknown) => {
    if (!editedPreview) return
    setEditedPreview({ ...editedPreview, [field]: value })
  }

  const updateConstitutionField = (field: keyof Constitution, value: string) => {
    if (!constitution) return
    setConstitution({ ...constitution, [field]: value })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <Loader2 style={{ width: 24, height: 24, animation: 'spin 1s linear infinite', color: 'var(--amber-warm)' }} />
      </div>
    )
  }

  if (error && !sourceData) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{
          padding: '2rem',
          background: 'rgba(244, 63, 94, 0.1)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: 12,
          textAlign: 'center'
        }}>
          <p style={{ color: '#fda4af', marginBottom: '1rem' }}>{error}</p>
          <button
            onClick={handleBack}
            className="app-button-secondary"
          >
            Go back
          </button>
        </div>
      </div>
    )
  }

  if (!sourceData || !editedPreview || !constitution) return null

  const isWorking = isSubmitting

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Back Button */}
      <button
        onClick={handleBack}
        disabled={isWorking}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0',
          marginBottom: '1.5rem',
          background: 'none',
          border: 'none',
          color: 'var(--moon-soft)',
          cursor: isWorking ? 'not-allowed' : 'pointer',
          opacity: isWorking ? 0.5 : 0.7,
          transition: 'opacity 0.2s',
          fontSize: '0.875rem',
        }}
        onMouseEnter={(e) => { if (!isWorking) e.currentTarget.style.opacity = '1' }}
        onMouseLeave={(e) => { if (!isWorking) e.currentTarget.style.opacity = '0.7' }}
      >
        <ArrowLeft style={{ width: 16, height: 16 }} />
        Back to book
      </button>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="app-heading-1" style={{ marginBottom: '0.75rem' }}>
          Create New Version
        </h1>
        <p className="app-body" style={{ opacity: 0.7 }}>
          Regenerate this story with new settings. Your original will be preserved.
        </p>
      </div>

      {/* Info Callout */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '1rem',
        background: 'rgba(147, 197, 253, 0.1)',
        border: '1px solid rgba(147, 197, 253, 0.2)',
        borderRadius: 12,
        marginBottom: '2rem',
      }}>
        <Info style={{ width: 20, height: 20, color: '#93c5fd', flexShrink: 0, marginTop: 2 }} />
        <p className="app-body-sm" style={{ color: '#93c5fd' }}>
          This creates a brand new book based on your original. The new version will appear in your library alongside the original.
        </p>
      </div>

      {/* Regeneration Scope */}
      <div style={{ marginBottom: '2rem' }}>
        <label className="app-body" style={{ fontWeight: 500, display: 'block', marginBottom: '1rem' }}>
          What to regenerate
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            onClick={() => setRegenScope('full')}
            disabled={isWorking}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem',
              borderRadius: 12,
              textAlign: 'left',
              transition: 'all 0.2s',
              background: regenScope === 'full'
                ? 'rgba(212, 165, 116, 0.15)'
                : 'rgba(26, 39, 68, 0.5)',
              border: regenScope === 'full'
                ? '2px solid var(--amber-warm)'
                : '2px solid rgba(250, 246, 237, 0.08)',
              cursor: isWorking ? 'not-allowed' : 'pointer',
              opacity: isWorking ? 0.5 : 1,
            }}
          >
            <RefreshCw style={{ width: 20, height: 20, color: regenScope === 'full' ? 'var(--amber-warm)' : 'var(--moon-soft)' }} />
            <div>
              <span style={{ fontWeight: 600, color: 'var(--moon-light)', display: 'block' }}>
                Regenerate entire book
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--moon-soft)', opacity: 0.8 }}>
                Start fresh with a completely new version
              </span>
            </div>
          </button>

          {sourceData.chapters.length > 1 && (
            <button
              onClick={() => setRegenScope('from_chapter')}
              disabled={isWorking}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem',
                borderRadius: 12,
                textAlign: 'left',
                transition: 'all 0.2s',
                background: regenScope === 'from_chapter'
                  ? 'rgba(212, 165, 116, 0.15)'
                  : 'rgba(26, 39, 68, 0.5)',
                border: regenScope === 'from_chapter'
                  ? '2px solid var(--amber-warm)'
                  : '2px solid rgba(250, 246, 237, 0.08)',
                cursor: isWorking ? 'not-allowed' : 'pointer',
                opacity: isWorking ? 0.5 : 1,
              }}
            >
              <ChevronDown style={{ width: 20, height: 20, color: regenScope === 'from_chapter' ? 'var(--amber-warm)' : 'var(--moon-soft)' }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, color: 'var(--moon-light)', display: 'block' }}>
                  Regenerate from a chapter
                </span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--moon-soft)', opacity: 0.8 }}>
                  Keep earlier chapters, rewrite the rest
                </span>
              </div>
            </button>
          )}
        </div>

        {/* Chapter selector */}
        {regenScope === 'from_chapter' && sourceData.chapters.length > 1 && (
          <div style={{ marginTop: '1rem', marginLeft: '2.75rem' }}>
            <label className="app-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Start rewriting from
            </label>
            <select
              value={fromChapterIndex}
              onChange={(e) => setFromChapterIndex(Number(e.target.value))}
              disabled={isWorking}
              className="app-input"
              style={{ maxWidth: 300 }}
            >
              {sourceData.chapters.slice(1).map((chapter) => (
                <option key={chapter.index} value={chapter.index}>
                  Chapter {chapter.index + 1}: {chapter.title}
                </option>
              ))}
            </select>
            <p className="app-body-sm" style={{ marginTop: '0.5rem', opacity: 0.7 }}>
              Chapters 1-{fromChapterIndex} will be copied as-is.
            </p>
          </div>
        )}
      </div>

      {/* Preview Editor */}
      <div className="app-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '2rem' }}>
        {/* Title */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(250, 246, 237, 0.06)' }}>
          <label className="app-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Title
          </label>
          <input
            type="text"
            value={editedPreview.title}
            onChange={(e) => updatePreviewField('title', e.target.value)}
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
            onChange={(e) => updatePreviewField('logline', e.target.value)}
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
            onChange={(e) => updatePreviewField('blurb', e.target.value)}
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
                    updatePreviewField('cast', newCast)
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
                    updatePreviewField('cast', newCast)
                  }}
                  disabled={isWorking}
                  rows={2}
                  className="app-textarea"
                  style={{ flex: 1, resize: 'none', minHeight: 'auto' }}
                  placeholder="Who they are..."
                />
                {editedPreview.cast.length > 1 && (
                  <button
                    onClick={() => {
                      const newCast = editedPreview.cast.filter((_, i) => i !== idx)
                      updatePreviewField('cast', newCast)
                    }}
                    disabled={isWorking}
                    style={{
                      padding: '0.5rem',
                      background: 'rgba(244, 63, 94, 0.1)',
                      border: '1px solid rgba(244, 63, 94, 0.2)',
                      borderRadius: 8,
                      cursor: isWorking ? 'not-allowed' : 'pointer',
                      opacity: isWorking ? 0.5 : 0.7,
                      transition: 'all 0.2s',
                      flexShrink: 0,
                      marginTop: '0.25rem',
                    }}
                    onMouseEnter={(e) => { if (!isWorking) e.currentTarget.style.opacity = '1' }}
                    onMouseLeave={(e) => { if (!isWorking) e.currentTarget.style.opacity = '0.7' }}
                    title="Remove character"
                  >
                    <X style={{ width: 14, height: 14, color: '#fda4af' }} />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => {
                const newCast = [...editedPreview.cast, { name: '', tagline: '' }]
                updatePreviewField('cast', newCast)
              }}
              disabled={isWorking || editedPreview.cast.length >= 8}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                background: 'rgba(212, 165, 116, 0.08)',
                border: '1px dashed rgba(212, 165, 116, 0.3)',
                borderRadius: 8,
                cursor: isWorking || editedPreview.cast.length >= 8 ? 'not-allowed' : 'pointer',
                opacity: isWorking || editedPreview.cast.length >= 8 ? 0.4 : 0.7,
                transition: 'all 0.2s',
                color: 'var(--amber-warm)',
                fontSize: '0.875rem',
                marginTop: '0.5rem',
              }}
              onMouseEnter={(e) => { if (!isWorking && editedPreview.cast.length < 8) e.currentTarget.style.opacity = '1' }}
              onMouseLeave={(e) => { if (!isWorking && editedPreview.cast.length < 8) e.currentTarget.style.opacity = '0.7' }}
            >
              <Plus style={{ width: 16, height: 16 }} />
              Add character
            </button>
          </div>
        </div>

        {/* Setting */}
        <div style={{ padding: '1.5rem' }}>
          <label className="app-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Setting
          </label>
          <textarea
            value={editedPreview.setting}
            onChange={(e) => updatePreviewField('setting', e.target.value)}
            disabled={isWorking}
            rows={2}
            className="app-textarea"
            style={{ background: 'transparent', border: 'none', padding: 0, resize: 'none' }}
            placeholder="Where and when..."
          />
        </div>
      </div>

      {/* Story Sliders */}
      <div style={{ marginBottom: '2rem' }}>
        <label className="app-body" style={{ fontWeight: 500, display: 'block', marginBottom: '1rem' }}>
          Story preferences
        </label>
        <StorySlidersComponent
          sliders={sliders}
          onChange={setSliders}
          showAdvanced={showAdvancedSliders}
          onToggleAdvanced={() => setShowAdvancedSliders(!showAdvancedSliders)}
          disabled={isWorking}
        />
      </div>

      {/* Constitution Editor (Collapsible) */}
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => setShowConstitution(!showConstitution)}
          disabled={isWorking}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '1rem',
            background: 'rgba(26, 39, 68, 0.5)',
            border: '1px solid rgba(250, 246, 237, 0.08)',
            borderRadius: 12,
            cursor: isWorking ? 'not-allowed' : 'pointer',
            opacity: isWorking ? 0.5 : 1,
          }}
        >
          <span className="app-body" style={{ fontWeight: 500 }}>
            Story Constitution
          </span>
          <ChevronDown style={{
            width: 20,
            height: 20,
            color: 'var(--moon-soft)',
            transform: showConstitution ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }} />
        </button>

        {showConstitution && (
          <div className="app-card" style={{ marginTop: '0.75rem' }}>
            <p className="app-body-sm" style={{ marginBottom: '1rem', opacity: 0.7 }}>
              The constitution guides the AI&apos;s writing decisions. Edit to change the story&apos;s core identity.
            </p>

            {[
              { key: 'central_thesis', label: 'Central Thesis', placeholder: 'The main argument or theme...' },
              { key: 'worldview_frame', label: 'Worldview Frame', placeholder: 'How the story sees the world...' },
              { key: 'narrative_voice', label: 'Narrative Voice', placeholder: 'The tone and style of narration...' },
              { key: 'what_book_is_against', label: 'What This Book Is Against', placeholder: 'Ideas or tropes this story opposes...' },
              { key: 'what_book_refuses_to_do', label: 'What This Book Refuses To Do', placeholder: 'Patterns this story avoids...' },
              { key: 'ideal_reader', label: 'Ideal Reader', placeholder: 'Who this story is written for...' },
              { key: 'taboo_simplifications', label: 'Taboo Simplifications', placeholder: 'Oversimplifications to avoid...' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} style={{ marginBottom: '1rem' }}>
                <label className="app-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                  {label}
                </label>
                <textarea
                  value={constitution[key as keyof Constitution] || ''}
                  onChange={(e) => updateConstitutionField(key as keyof Constitution, e.target.value)}
                  disabled={isWorking}
                  rows={2}
                  className="app-textarea"
                  style={{ resize: 'vertical' }}
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          marginBottom: '1.5rem',
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

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isWorking}
        className="app-button-primary"
        style={{
          width: '100%',
          justifyContent: 'center',
          padding: '1.125rem 2rem',
          fontSize: '1.125rem',
          opacity: isWorking ? 0.5 : 1,
          cursor: isWorking ? 'not-allowed' : 'pointer',
          marginBottom: '1rem',
        }}
      >
        {isSubmitting ? (
          <>
            <Loader2 style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }} />
            Creating new version...
          </>
        ) : (
          <>
            <RefreshCw style={{ width: 20, height: 20 }} />
            Create New Version
          </>
        )}
      </button>

      <p className="app-body-sm" style={{ textAlign: 'center', opacity: 0.7 }}>
        This will count toward your daily generation limit.
      </p>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
