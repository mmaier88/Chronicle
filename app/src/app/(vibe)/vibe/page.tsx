import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Sparkles, BookOpen, Clock } from 'lucide-react'

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
    .limit(3)

  return (
    <div className="space-y-20">
      {/* Hero Section */}
      <section className="pt-8 md:pt-16">
        <div className="max-w-2xl">
          {/* Tiny sparkle accent */}
          <div className="flex items-center gap-2 text-amber-600 mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium tracking-wide uppercase">Magic awaits</span>
          </div>

          {/* Big editorial title */}
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-medium text-amber-950 tracking-tight leading-[1.1] mb-6">
            Vibe a Book
          </h1>

          <p className="text-xl md:text-2xl text-amber-800/70 leading-relaxed mb-10 max-w-xl">
            A short book, generated just for you. Pick a genre, give us a vibe, and we&apos;ll write the rest.
          </p>

          {/* CTA */}
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/vibe/new"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-600 to-rose-500 text-white rounded-full font-medium text-lg shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 hover:scale-[1.02] transition-all duration-200"
            >
              <Sparkles className="w-5 h-5" />
              Start creating
            </Link>
          </div>
        </div>
      </section>

      {/* Feature chips */}
      <section>
        <div className="flex flex-wrap gap-3">
          {[
            { icon: '✨', text: '~30 pages of magic' },
            { icon: '🎭', text: 'Your vibe, your voice' },
            { icon: '🤫', text: 'No outline spoilers' },
          ].map((chip, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm border border-amber-200/50 rounded-full text-amber-800"
            >
              <span>{chip.icon}</span>
              <span className="text-sm font-medium">{chip.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works - subtle */}
      <section className="grid md:grid-cols-3 gap-8">
        {[
          {
            step: '01',
            title: 'Pick your vibe',
            desc: 'Choose a genre and describe the feeling you want.',
          },
          {
            step: '02',
            title: 'Edit the cover',
            desc: 'You approve the back-cover blurb. No spoilers.',
          },
          {
            step: '03',
            title: 'Read your book',
            desc: 'We write it. You enjoy it. Simple as that.',
          },
        ].map((item, idx) => (
          <div key={idx} className="group">
            <span className="text-xs font-medium text-amber-500 tracking-widest">{item.step}</span>
            <h3 className="font-serif text-xl text-amber-950 mt-2 mb-2">{item.title}</h3>
            <p className="text-amber-700/70 text-sm leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </section>

      {/* Recent books */}
      {vibeBooks && vibeBooks.length > 0 && (
        <section>
          <h2 className="font-serif text-2xl text-amber-950 mb-6">Your stories</h2>
          <div className="space-y-3">
            {vibeBooks.map((book) => (
              <Link
                key={book.id}
                href={book.status === 'final' ? `/vibe/read/${book.id}` : `/books/${book.id}`}
                className="flex items-center justify-between p-5 bg-white/70 backdrop-blur-sm border border-amber-100 rounded-2xl hover:bg-white hover:shadow-lg hover:shadow-amber-100/50 transition-all duration-200 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-rose-100 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg text-amber-950 group-hover:text-amber-700 transition-colors">
                      {book.title}
                    </h3>
                    <p className="text-sm text-amber-600/60">
                      {new Date(book.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs font-medium px-3 py-1 rounded-full ${
                    book.status === 'final'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {book.status === 'final' ? 'Ready to read' : 'Creating...'}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      <section className="text-center py-12">
        <p className="text-amber-700/60 mb-6 text-lg">Ready to create something wonderful?</p>
        <Link
          href="/vibe/new"
          className="inline-flex items-center gap-2 px-6 py-3 bg-amber-950 text-amber-50 rounded-full font-medium hover:bg-amber-900 transition-colors"
        >
          Let&apos;s go
          <span className="text-amber-400">→</span>
        </Link>
      </section>
    </div>
  )
}
