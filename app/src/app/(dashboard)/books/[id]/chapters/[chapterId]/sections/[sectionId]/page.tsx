import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Book, Chapter, Section } from '@/types/chronicle'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SectionEditor } from '@/components/books/SectionEditor'

export default async function SectionPage({
  params,
}: {
  params: Promise<{ id: string; chapterId: string; sectionId: string }>
}) {
  const { id, chapterId, sectionId } = await params
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

  const { data: section } = await supabase
    .from('sections')
    .select('*')
    .eq('id', sectionId)
    .eq('chapter_id', chapterId)
    .single()

  if (!section) {
    notFound()
  }

  const typedSection = section as Section

  return (
    <div>
      <Link
        href={`/books/${id}/chapters/${chapterId}`}
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {typedChapter.title}
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <span>{typedBook.title}</span>
          <span>/</span>
          <span>Chapter {typedChapter.index + 1}</span>
          <span>/</span>
          <span>Section {typedSection.index + 1}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{typedSection.title}</h1>
        <div className="flex items-center gap-3 mt-2">
          <span className={`text-xs px-2 py-1 rounded-full ${
            typedSection.status === 'draft' ? 'bg-gray-100 text-gray-600' :
            typedSection.status === 'locked' ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
            {typedSection.status}
          </span>
          {typedSection.promoted_at && (
            <span className="text-xs text-gray-500">
              Promoted {new Date(typedSection.promoted_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <SectionEditor
        section={typedSection}
        book={typedBook}
        chapter={typedChapter}
      />
    </div>
  )
}
