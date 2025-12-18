'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Feather, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react'
import { BookGenre } from '@/types/chronicle'

const GENRES: { value: BookGenre; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'literary_fiction',
    label: 'Literary Fiction',
    description: 'Character-driven stories with rich themes and emotional depth',
    icon: <Feather className="w-6 h-6" />
  },
  {
    value: 'non_fiction',
    label: 'Non-Fiction',
    description: 'Essays, memoirs, and explorations of real-world ideas',
    icon: <BookOpen className="w-6 h-6" />
  },
]

const PROMPT_EXAMPLES = [
  "A disgraced knight seeking redemption in a kingdom where magic is forbidden",
  "A coffee shop owner who discovers their regular customers are all time travelers",
  "An exploration of solitude through the lens of lighthouse keepers across history",
  "A musician who can only compose when they forget who they are",
]

export default function VibeNewPage() {
  const router = useRouter()
  const [selectedGenre, setSelectedGenre] = useState<BookGenre | null>(null)
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        setError(data.error || 'Failed to generate preview')
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
    } catch (err) {
      setError('Failed to connect. Please try again.')
      setIsGenerating(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.push('/vibe')}
        className="flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="space-y-8">
        {/* Step 1: Genre */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">1. Choose your genre</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {GENRES.map((genre) => (
              <button
                key={genre.value}
                onClick={() => setSelectedGenre(genre.value)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedGenre === genre.value
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                  selectedGenre === genre.value ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {genre.icon}
                </div>
                <h3 className="font-medium text-gray-900">{genre.label}</h3>
                <p className="text-sm text-gray-500 mt-1">{genre.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Prompt */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Describe your story</h2>
          <p className="text-sm text-gray-500 mb-4">
            Give us 1-5 sentences about your concept. Don&apos;t worry about perfection—we&apos;ll help shape it.
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A story about..."
            className="w-full h-32 p-4 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 resize-none"
            disabled={isGenerating}
          />

          {/* Example prompts */}
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">Need inspiration? Try one of these:</p>
            <div className="flex flex-wrap gap-2">
              {PROMPT_EXAMPLES.map((example, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(example)}
                  className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  disabled={isGenerating}
                >
                  {example.slice(0, 40)}...
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!selectedGenre || !prompt.trim() || isGenerating}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating Preview...
            </>
          ) : (
            <>
              Generate Preview
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        <p className="text-center text-xs text-gray-500">
          We&apos;ll create a spoiler-free preview you can review before generating the full book.
        </p>
      </div>
    </div>
  )
}
