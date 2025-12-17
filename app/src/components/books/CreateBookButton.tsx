'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, X } from 'lucide-react'
import type { BookGenre } from '@/types/chronicle'

export function CreateBookButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState<BookGenre>('non_fiction')
  const [coreQuestion, setCoreQuestion] = useState('')
  const router = useRouter()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setIsLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('books')
      .insert({
        owner_id: user.id,
        title: title.trim(),
        genre,
        core_question: coreQuestion.trim() || null,
      })
      .select()
      .single()

    setIsLoading(false)

    if (error) {
      console.error('Error creating book:', error)
      return
    }

    setTitle('')
    setCoreQuestion('')
    setIsOpen(false)
    router.push(`/books/${data.id}`)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
      >
        <Plus className="w-4 h-4" />
        New Book
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Create New Book</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Book Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter your book title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="genre" className="block text-sm font-medium text-gray-700 mb-1">
                  Genre
                </label>
                <select
                  id="genre"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value as BookGenre)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="non_fiction">Non-Fiction</option>
                  <option value="literary_fiction">Literary Fiction</option>
                </select>
              </div>

              <div>
                <label htmlFor="coreQuestion" className="block text-sm font-medium text-gray-700 mb-1">
                  Core Question
                </label>
                <textarea
                  id="coreQuestion"
                  value={coreQuestion}
                  onChange={(e) => setCoreQuestion(e.target.value)}
                  placeholder="What central question does this book explore?"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !title.trim()}
                  className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating...' : 'Create Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
