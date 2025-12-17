import { createClient } from '@/lib/supabase/server'
import { Book } from '@/types/chronicle'
import Link from 'next/link'
import { Plus, BookOpen, Clock, FileText } from 'lucide-react'
import { CreateBookButton } from '@/components/books/CreateBookButton'

export default async function BooksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: books, error } = await supabase
    .from('books')
    .select('*')
    .eq('owner_id', user?.id)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching books:', error)
  }

  const typedBooks = (books || []) as Book[]

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Books</h1>
          <p className="text-gray-600 mt-1">Create and manage your book projects</p>
        </div>
        <CreateBookButton />
      </div>

      {typedBooks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No books yet</h3>
          <p className="text-gray-600 mb-4">Get started by creating your first book project</p>
          <CreateBookButton />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {typedBooks.map((book) => (
            <Link
              key={book.id}
              href={`/books/${book.id}`}
              className="block bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900 line-clamp-1">{book.title}</h2>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  book.status === 'drafting' ? 'bg-yellow-100 text-yellow-800' :
                  book.status === 'editing' ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {book.status}
                </span>
              </div>

              {book.core_question && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{book.core_question}</p>
              )}

              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {book.genre === 'non_fiction' ? 'Non-Fiction' : 'Literary Fiction'}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(book.updated_at).toLocaleDateString()}
                </span>
              </div>

              {book.constitution_locked && (
                <div className="mt-3 text-xs text-green-600 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Constitution locked
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
