import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Sparkles, Clock, ChevronRight } from 'lucide-react'

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

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
    <div className="max-w-3xl mx-auto">
      {/* Back button */}
      <Link
        href="/vibe"
        className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Vibe
      </Link>

      {/* Book Header */}
      <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-8 text-white mb-8">
        <div className="flex items-center gap-2 text-purple-200 text-sm mb-4">
          <Sparkles className="w-4 h-4" />
          Generated for you
        </div>
        <h1 className="text-3xl font-bold mb-2">{book.title}</h1>
        {book.core_question && (
          <p className="text-purple-100 text-lg">{book.core_question}</p>
        )}
        <div className="flex items-center gap-4 mt-6 text-sm text-purple-200">
          <span className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            {sortedChapters.length} chapters
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            ~{Math.ceil(totalWords / 250)} min read
          </span>
        </div>
      </div>

      {/* Table of Contents */}
      <div className="bg-white rounded-xl border border-gray-200 mb-8">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Table of Contents</h2>
        </div>
        <nav className="divide-y divide-gray-100">
          {sortedChapters.map((chapter, idx) => (
            <a
              key={chapter.id}
              href={`#chapter-${idx + 1}`}
              className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div>
                <span className="text-sm text-gray-500">Chapter {idx + 1}</span>
                <h3 className="font-medium text-gray-900">{chapter.title}</h3>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </a>
          ))}
        </nav>
      </div>

      {/* Book Content */}
      <div className="space-y-12">
        {sortedChapters.map((chapter, chIdx) => (
          <article key={chapter.id} id={`chapter-${chIdx + 1}`} className="scroll-mt-8">
            {/* Chapter Header */}
            <div className="text-center mb-8 py-8 border-y border-gray-200">
              <span className="text-sm text-purple-600 font-medium">Chapter {chIdx + 1}</span>
              <h2 className="text-2xl font-bold text-gray-900 mt-1">{chapter.title}</h2>
            </div>

            {/* Sections */}
            <div className="prose prose-gray max-w-none">
              {chapter.sections.map((section) => (
                <div key={section.id} className="mb-8">
                  {chapter.sections.length > 1 && (
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">{section.title}</h3>
                  )}
                  <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {section.content_text || <span className="text-gray-400 italic">No content</span>}
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      {/* End */}
      <div className="text-center py-16 border-t border-gray-200 mt-12">
        <p className="text-gray-500 text-sm mb-6">The End</p>
        <div className="flex items-center justify-center gap-2 text-purple-600">
          <Sparkles className="w-5 h-5" />
          <span className="font-medium">Generated with Chronicle</span>
        </div>
        <Link
          href="/vibe/new"
          className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
        >
          Create Another Book
        </Link>
      </div>
    </div>
  )
}
