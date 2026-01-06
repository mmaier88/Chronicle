import { createClient, getUser, createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Sparkles, Clock, Headphones } from 'lucide-react'
import { SectionAudioPlayer } from '@/components/audio/SectionAudioPlayer'

interface Chapter {
  id: string
  index: number
  title: string
  sections: Section[]
}

interface Section {
  id: string
  index: number
  title: string
  content_text: string | null
}

export default async function VibeReadPage({
  params,
}: {
  params: Promise<{ bookId: string }>
}) {
  const { bookId } = await params
  const { user, isDevUser } = await getUser()

  if (!user) {
    notFound()
  }

  const supabase = isDevUser ? createServiceClient() : await createClient()

  // Fetch book
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .eq('owner_id', user.id)
    .single()

  if (bookError || !book) {
    notFound()
  }

  // Fetch chapters with sections
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, index, title, sections(id, index, title, content_text)')
    .eq('book_id', bookId)
    .order('index')

  const sortedChapters = (chapters || []).map(ch => ({
    ...ch,
    sections: (ch.sections || []).sort((a: Section, b: Section) => a.index - b.index)
  })) as Chapter[]

  // Calculate stats
  const totalWords = sortedChapters.reduce((sum, ch) =>
    sum + ch.sections.reduce((sSum, s) =>
      sSum + (s.content_text?.split(/\s+/).length || 0), 0
    ), 0
  )

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back button */}
      <Link
        href="/vibe"
        className="inline-flex items-center gap-1.5 text-amber-600 hover:text-amber-800 transition-colors mb-10"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Your stories</span>
      </Link>

      {/* Book Header */}
      <header className="mb-12 pb-10 border-b border-amber-100">
        <div className="flex items-center gap-2 text-amber-600 text-sm mb-4">
          <Sparkles className="w-4 h-4" />
          <span className="font-medium">Written just for you</span>
        </div>
        <h1 className="font-serif text-4xl md:text-5xl text-amber-950 tracking-tight leading-tight mb-4">
          {book.title}
        </h1>
        {book.core_question && (
          <p className="text-xl text-amber-800/70 leading-relaxed italic">
            {book.core_question}
          </p>
        )}
        <div className="flex items-center gap-6 mt-8 text-sm text-amber-600/70">
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" />
            {sortedChapters.length} chapters
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            ~{Math.ceil(totalWords / 250)} min read
          </span>
          <span className="flex items-center gap-1.5">
            <Headphones className="w-4 h-4" />
            ~{Math.ceil(totalWords / 150)} min listen
          </span>
        </div>
      </header>

      {/* Table of Contents */}
      <nav className="mb-16">
        <h2 className="text-xs font-medium text-amber-500 uppercase tracking-widest mb-4">
          Contents
        </h2>
        <div className="space-y-1">
          {sortedChapters.map((chapter, idx) => (
            <a
              key={chapter.id}
              href={`#chapter-${idx + 1}`}
              className="flex items-baseline gap-4 py-2 text-amber-800 hover:text-amber-950 transition-colors group"
            >
              <span className="text-sm text-amber-400 font-medium w-8">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <span className="font-serif text-lg group-hover:underline underline-offset-4 decoration-amber-200">
                {chapter.title}
              </span>
            </a>
          ))}
        </div>
      </nav>

      {/* Book Content */}
      <div className="space-y-16">
        {sortedChapters.map((chapter, chIdx) => (
          <article key={chapter.id} id={`chapter-${chIdx + 1}`} className="scroll-mt-8">
            {/* Chapter Header */}
            <div className="text-center mb-10 py-6">
              <span className="text-xs font-medium text-amber-500 uppercase tracking-widest">
                Chapter {chIdx + 1}
              </span>
              <h2 className="font-serif text-2xl md:text-3xl text-amber-950 mt-2 tracking-tight">
                {chapter.title}
              </h2>
            </div>

            {/* Sections */}
            <div className="space-y-8">
              {chapter.sections.map((section) => (
                <div key={section.id}>
                  <div className="flex items-center justify-between mb-4">
                    {chapter.sections.length > 1 ? (
                      <h3 className="font-serif text-lg text-amber-900">{section.title}</h3>
                    ) : (
                      <div />
                    )}
                    {section.content_text && (
                      <SectionAudioPlayer
                        sectionId={section.id}
                        sectionTitle={section.title}
                      />
                    )}
                  </div>
                  <div className="text-amber-900/90 leading-relaxed text-lg whitespace-pre-wrap font-serif">
                    {section.content_text || (
                      <span className="text-amber-400 italic">This section is still being written...</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Chapter divider */}
            {chIdx < sortedChapters.length - 1 && (
              <div className="flex justify-center mt-12">
                <div className="flex items-center gap-2 text-amber-300">
                  <span className="w-8 h-px bg-amber-200" />
                  <span className="text-lg">✦</span>
                  <span className="w-8 h-px bg-amber-200" />
                </div>
              </div>
            )}
          </article>
        ))}
      </div>

      {/* End */}
      <footer className="text-center py-20 mt-16 border-t border-amber-100">
        <p className="font-serif text-2xl text-amber-400 italic mb-6">— The End —</p>
        <div className="flex items-center justify-center gap-2 text-amber-600 mb-8">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">Made with Chronicle</span>
        </div>
        <Link
          href="/vibe/new"
          className="inline-flex items-center gap-2 px-6 py-3 bg-amber-950 text-amber-50 rounded-full font-medium hover:bg-amber-900 transition-colors"
        >
          Create another story
          <span className="text-amber-400">→</span>
        </Link>
      </footer>
    </div>
  )
}
