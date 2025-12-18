'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Feather, BookOpen, Sparkles, Loader2, Shuffle } from 'lucide-react'
import { BookGenre } from '@/types/chronicle'

const GENRES: { value: BookGenre; label: string; emoji: string; vibe: string }[] = [
  {
    value: 'literary_fiction',
    label: 'Literary Fiction',
    emoji: '✨',
    vibe: 'Character-driven, thematic depth',
  },
  {
    value: 'non_fiction',
    label: 'Non-Fiction',
    emoji: '📖',
    vibe: 'Essays, ideas, real-world tales',
  },
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
  const [selectedGenre, setSelectedGenre] = useState<BookGenre | null>(null)
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSurpriseMe = () => {
    const randomPrompt = PROMPT_SEEDS[Math.floor(Math.random() * PROMPT_SEEDS.length)]
    setPrompt(randomPrompt)
  }

  const handleSubmit = async () => {
    if (!selectedGenre || !prompt.trim()) return

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/vibe/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genre: selectedGenre,
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
        genre: selectedGenre,
        prompt: prompt.trim(),
        preview: data.preview,
      }))

      router.push('/vibe/preview')
    } catch {
      setError('Couldn\'t connect. Let\'s try that again.')
      setIsGenerating(false)
    }
  }

  const isValid = selectedGenre && prompt.trim().length >= 20

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <h1 className="font-serif text-3xl md:text-4xl text-amber-950 tracking-tight mb-3">
          Let&apos;s create something magic
        </h1>
        <p className="text-amber-700/70 text-lg">
          Pick a genre. Give us a vibe. We&apos;ll write the rest.
        </p>
      </div>

      <div className="space-y-10">
        {/* Genre Picker */}
        <section>
          <label className="block text-sm font-medium text-amber-800 mb-4">
            What kind of story?
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            {GENRES.map((genre) => (
              <button
                key={genre.value}
                onClick={() => setSelectedGenre(genre.value)}
                disabled={isGenerating}
                className={`p-5 rounded-2xl text-left transition-all duration-200 ${
                  selectedGenre === genre.value
                    ? 'bg-white border-2 border-amber-500 shadow-lg shadow-amber-100'
                    : 'bg-white/50 border-2 border-transparent hover:bg-white hover:border-amber-200'
                }`}
              >
                <span className="text-2xl mb-2 block">{genre.emoji}</span>
                <h3 className="font-serif text-lg text-amber-950 mb-1">{genre.label}</h3>
                <p className="text-sm text-amber-600/70">{genre.vibe}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Prompt Input */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium text-amber-800">
              What&apos;s the vibe?
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
