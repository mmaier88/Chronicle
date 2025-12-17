import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Book, Chapter } from '@/types/chronicle'
import Link from 'next/link'
import { ArrowLeft, Plus, Lock, Unlock, BookOpen, FileText } from 'lucide-react'
import { ConstitutionEditor } from '@/components/books/ConstitutionEditor'
import { CreateChapterButton } from '@/components/books/CreateChapterButton'

export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: book, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (error || !book) {
    notFound()
  }

  const typedBook = book as Book

  const { data: chapters } = await supabase
    .from('chapters')
    .select('*')
    .eq('book_id', id)
    .order('index', { ascending: true })

  const typedChapters = (chapters || []) as Chapter[]

  return (
    <div>
      <Link
        href="/books"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Books
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{typedBook.title}</h1>
          <div className="flex items-center gap-4 mt-2">
            <span className={`text-xs px-2 py-1 rounded-full ${
              typedBook.status === 'drafting' ? 'bg-yellow-100 text-yellow-800' :
              typedBook.status === 'editing' ? 'bg-blue-100 text-blue-800' :
              'bg-green-100 text-green-800'
            }`}>
              {typedBook.status}
            </span>
            <span className="text-sm text-gray-600">
              {typedBook.genre === 'non_fiction' ? 'Non-Fiction' : 'Literary Fiction'}
            </span>
          </div>
          {typedBook.core_question && (
            <p className="text-gray-600 mt-3 max-w-2xl">{typedBook.core_question}</p>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Chapters</h2>
              {typedBook.constitution_locked && <CreateChapterButton bookId={typedBook.id} nextIndex={typedChapters.length} />}
            </div>

            {!typedBook.constitution_locked ? (
              <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
                <Lock className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-2">Lock the Constitution to add chapters</p>
                <p className="text-sm text-gray-500">The Constitution must be finalized before writing begins</p>
              </div>
            ) : typedChapters.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
                <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-2">No chapters yet</p>
                <p className="text-sm text-gray-500 mb-4">Start structuring your book by adding chapters</p>
                <CreateChapterButton bookId={typedBook.id} nextIndex={0} />
              </div>
            ) : (
              <div className="space-y-3">
                {typedChapters.map((chapter, idx) => (
                  <Link
                    key={chapter.id}
                    href={`/books/${typedBook.id}/chapters/${chapter.id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs text-gray-500">Chapter {idx + 1}</span>
                        <h3 className="font-medium text-gray-900">{chapter.title}</h3>
                        {chapter.purpose && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{chapter.purpose}</p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        chapter.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                        chapter.status === 'locked' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {chapter.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <ConstitutionEditor book={typedBook} />
        </div>
      </div>
    </div>
  )
}
