import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Sparkles, BookOpen, Clock, Zap, ArrowRight } from 'lucide-react'

export default async function VibeLandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch user's recent vibe books
  const { data: vibeBooks } = await supabase
    .from('books')
    .select('id, title, status, created_at')
    .eq('owner_id', user?.id)
    .eq('source', 'vibe')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center py-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4" />
          AI-Powered Book Generation
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Turn Your Idea Into a<br />
          <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            30-Page Book
          </span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          Just describe your concept. We&apos;ll generate a complete, coherent short book
          with characters, plot, and prose. No spoilers until you&apos;re ready to read.
        </p>
        <Link
          href="/vibe/new"
          className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
        >
          <Sparkles className="w-5 h-5" />
          Vibe a Book
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <Zap className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Instant Generation</h3>
          <p className="text-gray-600 text-sm">
            From idea to complete book in minutes. Watch as each chapter unfolds.
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <BookOpen className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Spoiler-Free Preview</h3>
          <p className="text-gray-600 text-sm">
            Approve the back-cover blurb without ruining the story. Then let AI write.
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <Clock className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Consistent Story</h3>
          <p className="text-gray-600 text-sm">
            AI checks for contradictions and keeps characters, plot, and tone aligned.
          </p>
        </div>
      </div>

      {/* Recent Vibe Books */}
      {vibeBooks && vibeBooks.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Generated Books</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {vibeBooks.map((book) => (
              <Link
                key={book.id}
                href={book.status === 'final' ? `/vibe/read/${book.id}` : `/books/${book.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{book.title}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(book.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  book.status === 'final'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {book.status === 'final' ? 'Ready to Read' : 'In Progress'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="text-center py-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl text-white">
        <h2 className="text-2xl font-bold mb-2">Ready to create your story?</h2>
        <p className="text-purple-100 mb-6">Just pick a genre and describe your idea.</p>
        <Link
          href="/vibe/new"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
        >
          Get Started
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
