'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sparkles, Loader2, Crown, Zap, ArrowLeft, X, Plus, CreditCard } from 'lucide-react'
import { VibePreview, BookGenre, StorySliders, DEFAULT_SLIDERS } from '@/types/chronicle'
import { StorySliders as StorySlidersComponent } from '@/components/create/StorySliders'
import { Edition, BookLength, getPrice, formatPrice, isFree, EDITION_INFO } from '@/lib/stripe/pricing'

interface VibeDraft {
  genre: BookGenre
  prompt: string
  preview: VibePreview
  length?: BookLength
  sliders?: StorySliders
}

export default function VibePreviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [draft, setDraft] = useState<VibeDraft | null>(null)
  const [editedPreview, setEditedPreview] = useState<VibePreview | null>(null)
  const [sliders, setSliders] = useState<StorySliders>(DEFAULT_SLIDERS)
  const [showAdvancedSliders, setShowAdvancedSliders] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [edition, setEdition] = useState<Edition>('standard')

  // Check for cancelled checkout
  useEffect(() => {
    if (searchParams.get('cancelled') === 'true') {
      setError('Checkout was cancelled. Your book is still here when you\'re ready.')
      // Clean up URL
      window.history.replaceState({}, '', '/create/preview')
    }
  }, [searchParams])

  useEffect(() => {
    // Guard for SSR - localStorage only available on client
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem('vibe_draft')
      if (stored) {
        const parsed = JSON.parse(stored) as VibeDraft
        // Validate required fields exist
        if (parsed && parsed.genre && parsed.prompt && parsed.preview) {
          setDraft(parsed)
          setEditedPreview(parsed.preview)
          if (parsed.sliders) {
            setSliders(parsed.sliders)
          }
          return
        }
      }
      // No valid draft, redirect to create page
      router.push('/create/new')
    } catch {
      // Invalid JSON in localStorage, clear and redirect
      localStorage.removeItem('vibe_draft')
      router.push('/create/new')
    }
  }, [router])

  const handleBack = () => {
    router.push('/create/new')
  }

  const handleCheckout = async () => {
    if (!draft || !editedPreview) return

    setIsRedirecting(true)
    setError(null)

    try {
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genre: draft.genre,
          prompt: draft.prompt,
          preview: editedPreview,
          length: draft.length || 30,
          edition: edition,
          sliders: sliders,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error?.message || 'Could not set up payment. Please try again.')
        setIsRedirecting(false)
        return
      }

      // Handle free tier - redirect directly to generating
      if (data.data.free && data.data.job_id) {
        localStorage.removeItem('vibe_draft')
        router.push(`/create/generating/${data.data.job_id}`)
        return
      }

      // Store draft for recovery if user cancels checkout
      localStorage.setItem('vibe_draft', JSON.stringify({
        genre: draft.genre,
        prompt: draft.prompt,
        preview: editedPreview,
        length: draft.length || 30,
        sliders: sliders,
      }))

      // Redirect to Stripe Checkout
      window.location.href = data.data.checkout_url
    } catch {
      setError('Could not connect to payment service. Please try again.')
      setIsRedirecting(false)
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

  const isWorking = isRedirecting
  const currentLength = (draft.length || 30) as BookLength
  const currentPrice = getPrice(edition, currentLength)

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
        Start over
      </button>

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
                {/* Delete button - only show if more than 1 character */}
                {editedPreview.cast.length > 1 && (
                  <button
                    onClick={() => {
                      const newCast = editedPreview.cast.filter((_, i) => i !== idx)
                      updateField('cast', newCast)
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
            {/* Add character button */}
            <button
              onClick={() => {
                const newCast = [...editedPreview.cast, { name: '', tagline: '' }]
                updateField('cast', newCast)
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

      {/* Story Preferences */}
      <div style={{ marginTop: '2rem' }}>
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
        <p className="app-body-sm" style={{ marginTop: '0.75rem' }}>
          Leave untouched to let the story decide.
        </p>
      </div>

      {/* Edition Selector */}
      <div style={{ marginTop: '2rem' }}>
        <label className="app-body" style={{ fontWeight: 500, display: 'block', marginBottom: '1rem' }}>
          Choose your edition
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          {/* Standard Edition */}
          <button
            onClick={() => setEdition('standard')}
            disabled={isWorking}
            style={{
              padding: '1.25rem',
              borderRadius: 12,
              textAlign: 'left',
              transition: 'all 0.2s',
              background: edition === 'standard'
                ? 'rgba(212, 165, 116, 0.15)'
                : 'rgba(26, 39, 68, 0.5)',
              border: edition === 'standard'
                ? '2px solid var(--amber-warm)'
                : '2px solid rgba(250, 246, 237, 0.08)',
              cursor: isWorking ? 'not-allowed' : 'pointer',
              opacity: isWorking ? 0.5 : 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap style={{ width: 18, height: 18, color: edition === 'standard' ? 'var(--amber-warm)' : 'var(--moon-soft)' }} />
                <span style={{ fontWeight: 600, color: 'var(--moon-light)', fontSize: '1.125rem' }}>
                  {EDITION_INFO.standard.name}
                </span>
              </div>
              <span style={{ fontWeight: 600, color: 'var(--amber-warm)', fontSize: '1.25rem' }}>
                {formatPrice(getPrice('standard', currentLength).price)}
              </span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--moon-soft)', opacity: 0.8 }}>
              {EDITION_INFO.standard.tagline}
            </p>
          </button>

          {/* Masterwork Edition */}
          <button
            onClick={() => setEdition('masterwork')}
            disabled={isWorking}
            style={{
              padding: '1.25rem',
              borderRadius: 12,
              textAlign: 'left',
              transition: 'all 0.2s',
              background: edition === 'masterwork'
                ? 'rgba(168, 85, 247, 0.15)'
                : 'rgba(26, 39, 68, 0.5)',
              border: edition === 'masterwork'
                ? '2px solid #a855f7'
                : '2px solid rgba(250, 246, 237, 0.08)',
              cursor: isWorking ? 'not-allowed' : 'pointer',
              opacity: isWorking ? 0.5 : 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Crown style={{ width: 18, height: 18, color: edition === 'masterwork' ? '#a855f7' : 'var(--moon-soft)' }} />
                <span style={{ fontWeight: 600, color: 'var(--moon-light)', fontSize: '1.125rem' }}>
                  {EDITION_INFO.masterwork.name}
                </span>
              </div>
              <span style={{ fontWeight: 600, color: '#a855f7', fontSize: '1.25rem' }}>
                {formatPrice(getPrice('masterwork', currentLength).price)}
              </span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--moon-soft)', opacity: 0.8 }}>
              {EDITION_INFO.masterwork.tagline}
            </p>
          </button>
        </div>

        {/* Edition features */}
        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(26, 39, 68, 0.3)', borderRadius: 8 }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--moon-soft)', marginBottom: '0.5rem', fontWeight: 500 }}>
            {edition === 'masterwork' ? 'Masterwork includes:' : 'Standard includes:'}
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.75rem', color: 'var(--moon-soft)', opacity: 0.8 }}>
            {EDITION_INFO[edition].features.map((feature, i) => (
              <li key={i} style={{ marginBottom: '0.25rem' }}>{feature}</li>
            ))}
          </ul>
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
        {/* Primary CTA */}
        <button
          onClick={handleCheckout}
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
          {isRedirecting ? (
            <>
              <Loader2 style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }} />
              {isFree(edition, currentLength) ? 'Creating your book...' : 'Preparing checkout...'}
            </>
          ) : isFree(edition, currentLength) ? (
            <>
              <Sparkles style={{ width: 20, height: 20 }} />
              Create for Free
            </>
          ) : (
            <>
              <CreditCard style={{ width: 20, height: 20 }} />
              Purchase for {formatPrice(currentPrice.price)}
            </>
          )}
        </button>

        <p className="app-body-sm" style={{ textAlign: 'center' }}>
          ~{currentLength} page {edition === 'masterwork' ? 'masterwork' : 'book'}. {edition === 'masterwork' ? 'Includes audiobook.' : 'Yours forever.'}
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
