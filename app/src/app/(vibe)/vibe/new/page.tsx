'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2, Shuffle } from 'lucide-react'
import { BookGenre } from '@/types/chronicle'

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

const PROMPT_SEEDS = [
  "A lighthouse keeper who starts receiving letters from someone who shouldn't exist...",
  "Two strangers meet at the same café every morning but never speak—until one day, one of them doesn't show up.",
  "A retired astronaut opens a bookshop in a small town, but the books keep rewriting themselves.",
  "In a city where it rains every day, one person wakes up to sunshine and realizes they're the only one who notices.",
  "A chef discovers their grandmother's recipe book contains more than just recipes.",
]

export default function VibeNewPage() {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [length, setLength] = useState<BookLength>(30)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSurpriseMe = () => {
    const randomPrompt = PROMPT_SEEDS[Math.floor(Math.random() * PROMPT_SEEDS.length)]
    setPrompt(randomPrompt)
  }

  const handleSubmit = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/vibe/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genre: DEFAULT_GENRE,
          prompt: prompt.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Something went wrong')
        setIsGenerating(false)
        return
      }

      // Store in localStorage for the preview page
      localStorage.setItem('vibe_draft', JSON.stringify({
        genre: DEFAULT_GENRE,
        prompt: prompt.trim(),
        preview: data.preview,
        length: length,
      }))

      router.push('/vibe/preview')
    } catch {
      setError('Couldn\'t connect. Let\'s try that again.')
      setIsGenerating(false)
    }
  }

  const isValid = prompt.trim().length >= 20

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <h1 className="font-serif text-3xl md:text-4xl text-amber-950 tracking-tight mb-3">
          Let&apos;s create something magical
        </h1>
        <p className="text-amber-700/70 text-lg">
          Share what you&apos;re drawn to. We&apos;ll craft the rest.
        </p>
      </div>

      <div className="space-y-10">
        {/* Prompt Input */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium text-amber-800">
              What are you drawn to?
            </label>
            <button
              onClick={handleSurpriseMe}
              disabled={isGenerating}
              className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-800 transition-colors"
            >
              <Shuffle className="w-3.5 h-3.5" />
              Surprise me
            </button>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A disgraced knight returns to a city that no longer believes in heroes..."
            disabled={isGenerating}
            className="w-full h-36 p-5 bg-white/70 border-2 border-amber-100 rounded-2xl text-amber-950 placeholder:text-amber-400 focus:outline-none focus:border-amber-300 focus:bg-white resize-none transition-all duration-200"
          />
          <p className="text-sm text-amber-500 mt-2">
            1–5 sentences. Don&apos;t overthink it.
          </p>
        </section>

        {/* Length Picker */}
        <section>
          <label className="block text-sm font-medium text-amber-800 mb-4">
            How long should it be?
          </label>
          <div className="grid grid-cols-2 gap-3">
            {LENGTH_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setLength(option.value)}
                disabled={isGenerating}
                className={`p-4 rounded-xl text-left transition-all duration-200 ${
                  length === option.value
                    ? 'bg-white border-2 border-amber-500 shadow-md'
                    : 'bg-white/50 border-2 border-transparent hover:bg-white hover:border-amber-200'
                }`}
              >
                <h3 className="font-medium text-amber-950">{option.label}</h3>
                <p className="text-xs text-amber-600/70 mt-0.5">{option.description}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!isValid || isGenerating}
          className="w-full py-4 bg-gradient-to-r from-amber-600 to-rose-500 text-white rounded-full font-medium text-lg flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:shadow-amber-500/30 hover:scale-[1.01] transition-all duration-200"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating your back cover...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Create my back cover
            </>
          )}
        </button>

        <p className="text-center text-sm text-amber-500">
          You&apos;ll get to edit everything on the next step.
        </p>
      </div>
    </div>
  )
}
