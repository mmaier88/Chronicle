'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2, Shuffle } from 'lucide-react'
import { BookGenre, StorySliders, DEFAULT_SLIDERS } from '@/types/chronicle'
import { StorySliders as StorySlidersComponent } from '@/components/create/StorySliders'

// Only literary fiction for now
const DEFAULT_GENRE: BookGenre = 'literary_fiction'

// Book length options
type BookLength = 30 | 60 | 120 | 300

const LENGTH_OPTIONS: { value: BookLength; label: string; description: string }[] = [
  { value: 30, label: 'Short Story', description: '~30 pages · 15 min read' },
  { value: 60, label: 'Novella', description: '~60 pages · 30 min read' },
  { value: 120, label: 'Short Novel', description: '~120 pages · 1 hour read' },
  { value: 300, label: 'Full Novel', description: '~300 pages · 2.5 hours read' },
]

export default function CreateNewPage() {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [length, setLength] = useState<BookLength>(30)
  const [sliders, setSliders] = useState<StorySliders>(DEFAULT_SLIDERS)
  const [showAdvancedSliders, setShowAdvancedSliders] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSurprising, setIsSurprising] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSurpriseMe = async () => {
    setIsSurprising(true)
    try {
      const response = await fetch('/api/create/surprise', { method: 'POST' })
      const data = await response.json()
      if (data.prompt) {
        setPrompt(data.prompt)
      }
    } catch {
      // Silently fail - user can just try again
    } finally {
      setIsSurprising(false)
    }
  }

  const handleSubmit = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/create/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genre: DEFAULT_GENRE,
          prompt: prompt.trim(),
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.error || 'Something went wrong')
        setIsGenerating(false)
        return
      }

      // Store in localStorage for the preview page
      localStorage.setItem('vibe_draft', JSON.stringify({
        genre: DEFAULT_GENRE,
        prompt: prompt.trim(),
        preview: result.data.preview,
        length: length,
        sliders: sliders,
      }))

      router.push('/create/preview')
    } catch {
      setError('Couldn\'t connect. Let\'s try that again.')
      setIsGenerating(false)
    }
  }

  const isValid = prompt.trim().length >= 20

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '3rem' }}>
        <h1 className="app-heading-1" style={{ marginBottom: '0.75rem' }}>
          Let&apos;s create something magical
        </h1>
        <p className="app-body" style={{ opacity: 0.7 }}>
          Share what you&apos;re drawn to. We&apos;ll craft the rest.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        {/* Prompt Input */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <label className="app-body" style={{ fontWeight: 500 }}>
              What are you drawn to?
            </label>
            <button
              onClick={handleSurpriseMe}
              disabled={isGenerating || isSurprising}
              className="app-nav-link"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                opacity: isSurprising ? 0.6 : 1,
              }}
            >
              {isSurprising ? (
                <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
              ) : (
                <Shuffle style={{ width: 14, height: 14 }} />
              )}
              {isSurprising ? 'Thinking...' : 'Surprise me'}
            </button>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A disgraced knight returns to a city that no longer believes in heroes..."
            disabled={isGenerating}
            className="app-textarea"
            style={{ height: 144 }}
          />
          <p className="app-body-sm" style={{ marginTop: '0.5rem' }}>
            1–5 sentences. Don&apos;t overthink it.
          </p>
        </section>

        {/* Length Picker */}
        <section>
          <label className="app-body" style={{ fontWeight: 500, display: 'block', marginBottom: '1rem' }}>
            How long should it be?
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            {LENGTH_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setLength(option.value)}
                disabled={isGenerating}
                style={{
                  padding: '1rem',
                  borderRadius: 12,
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  background: length === option.value
                    ? 'rgba(212, 165, 116, 0.15)'
                    : 'rgba(26, 39, 68, 0.5)',
                  border: length === option.value
                    ? '2px solid var(--amber-warm)'
                    : '2px solid rgba(250, 246, 237, 0.08)',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  opacity: isGenerating ? 0.5 : 1,
                }}
              >
                <h3 style={{
                  fontWeight: 500,
                  color: 'var(--moon-light)',
                  marginBottom: '0.25rem'
                }}>
                  {option.label}
                </h3>
                <p style={{
                  fontSize: '0.75rem',
                  color: 'var(--moon-soft)',
                  opacity: 0.7
                }}>
                  {option.description}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* Story Preferences */}
        <section>
          <label className="app-body" style={{ fontWeight: 500, display: 'block', marginBottom: '1rem' }}>
            Story preferences
          </label>
          <StorySlidersComponent
            sliders={sliders}
            onChange={setSliders}
            showAdvanced={showAdvancedSliders}
            onToggleAdvanced={() => setShowAdvancedSliders(!showAdvancedSliders)}
            disabled={isGenerating}
          />
          <p className="app-body-sm" style={{ marginTop: '0.75rem' }}>
            Leave untouched to let the story decide.
          </p>
        </section>

        {/* Error */}
        {error && (
          <div style={{
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

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!isValid || isGenerating}
          className="app-button-primary"
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '1.125rem 2rem',
            fontSize: '1.125rem',
            opacity: (!isValid || isGenerating) ? 0.5 : 1,
            cursor: (!isValid || isGenerating) ? 'not-allowed' : 'pointer',
          }}
        >
          {isGenerating ? (
            <>
              <Loader2 style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }} />
              Creating your back cover...
            </>
          ) : (
            <>
              <Sparkles style={{ width: 20, height: 20 }} />
              Create my back cover
            </>
          )}
        </button>

        <p className="app-body-sm" style={{ textAlign: 'center' }}>
          You&apos;ll get to edit everything on the next step.
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
