import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Book, Chapter, Section } from '@/types/chronicle'
import Link from 'next/link'
import { ArrowLeft, FileText, CheckCircle } from 'lucide-react'
import { CreateSectionButton } from '@/components/books/CreateSectionButton'

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ id: string; chapterId: string }>
}) {
  const { id, chapterId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: book } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (!book) {
    notFound()
  }

  const typedBook = book as Book

  const { data: chapter } = await supabase
    .from('chapters')
    .select('*')
    .eq('id', chapterId)
    .eq('book_id', id)
    .single()

  if (!chapter) {
    notFound()
  }

  const typedChapter = chapter as Chapter

  const { data: sections } = await supabase
    .from('sections')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('index', { ascending: true })

  const typedSections = (sections || []) as Section[]

  return (
    <div>
      <Link
        href={`/vibe/books/${id}`}
        className="inline-flex items-center gap-1 text-sm text-amber-700/70 hover:text-amber-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {typedBook.title}
      </Link>

      <div className="mb-8">
        <span className="text-sm text-amber-600/70">Chapter {typedChapter.index + 1}</span>
        <h1 className="text-2xl font-serif font-semibold text-amber-900">{typedChapter.title}</h1>
        <div className="flex items-center gap-3 mt-2">
          <span className={`text-xs px-2 py-1 rounded-full ${
            typedChapter.status === 'draft' ? 'bg-amber-100 text-amber-700' :
            typedChapter.status === 'locked' ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
            {typedChapter.status}
          </span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="bg-white/80 rounded-lg border border-amber-200/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-amber-900">Sections</h2>
              <CreateSectionButton chapterId={chapterId} bookId={id} nextIndex={typedSections.length} />
            </div>

            {typedSections.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-amber-300/60 rounded-lg">
                <FileText className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                <p className="text-amber-800 mb-2">No sections yet</p>
                <p className="text-sm text-amber-600/70 mb-4">Add sections to structure this chapter</p>
                <CreateSectionButton chapterId={chapterId} bookId={id} nextIndex={0} />
              </div>
            ) : (
              <div className="space-y-3">
                {typedSections.map((section, idx) => (
                  <Link
                    key={section.id}
                    href={`/vibe/books/${id}/chapters/${chapterId}/sections/${section.id}`}
                    className="block p-4 border border-amber-200/60 rounded-lg hover:border-amber-300 hover:shadow-sm transition-all bg-white/50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <span className="text-xs text-amber-600/70">Section {idx + 1}</span>
                        <h3 className="font-medium text-amber-900">{section.title}</h3>
                        {section.goal && (
                          <p className="text-sm text-amber-700/70 mt-1 line-clamp-2">{section.goal}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {section.status === 'canonical' && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          section.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                          section.status === 'locked' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {section.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white/80 rounded-lg border border-amber-200/60 p-6">
            <h3 className="font-semibold text-amber-900 mb-4">Chapter Details</h3>

            {typedChapter.purpose && (
              <div className="mb-4">
                <label className="text-xs font-medium text-amber-600/70 uppercase">Purpose</label>
                <p className="text-sm text-amber-800 mt-1">{typedChapter.purpose}</p>
              </div>
            )}

            {typedChapter.central_claim && (
              <div className="mb-4">
                <label className="text-xs font-medium text-amber-600/70 uppercase">Central Claim</label>
                <p className="text-sm text-amber-800 mt-1">{typedChapter.central_claim}</p>
              </div>
            )}

            {typedChapter.emotional_arc && (
              <div className="mb-4">
                <label className="text-xs font-medium text-amber-600/70 uppercase">Emotional Arc</label>
                <p className="text-sm text-amber-800 mt-1">{typedChapter.emotional_arc}</p>
              </div>
            )}

            {typedChapter.failure_mode && (
              <div className="mb-4">
                <label className="text-xs font-medium text-amber-600/70 uppercase">Failure Mode</label>
                <p className="text-sm text-amber-800 mt-1">{typedChapter.failure_mode}</p>
              </div>
            )}

            {typedChapter.motifs && typedChapter.motifs.length > 0 && (
              <div>
                <label className="text-xs font-medium text-amber-600/70 uppercase">Motifs</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {typedChapter.motifs.map((motif, idx) => (
                    <span key={idx} className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                      {motif}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!typedChapter.purpose && !typedChapter.central_claim && !typedChapter.emotional_arc && (
              <p className="text-sm text-amber-600/70">No additional details set for this chapter.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
