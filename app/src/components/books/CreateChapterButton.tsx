'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, X } from 'lucide-react'

interface CreateChapterButtonProps {
  bookId: string
  nextIndex: number
}

export function CreateChapterButton({ bookId, nextIndex }: CreateChapterButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [purpose, setPurpose] = useState('')
  const [centralClaim, setCentralClaim] = useState('')
  const router = useRouter()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('chapters')
      .insert({
        book_id: bookId,
        index: nextIndex,
        title: title.trim(),
        purpose: purpose.trim() || null,
        central_claim: centralClaim.trim() || null,
      })
      .select()
      .single()

    setIsLoading(false)

    if (error) {
      console.error('Error creating chapter:', error)
      return
    }

    setTitle('')
    setPurpose('')
    setCentralClaim('')
    setIsOpen(false)
    router.push(`/books/${bookId}/chapters/${data.id}`)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm"
      >
        <Plus className="w-4 h-4" />
        Add Chapter
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Create Chapter {nextIndex + 1}</h2>
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
                  Chapter Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter chapter title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-1">
                  Purpose
                </label>
                <textarea
                  id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="What is this chapter's purpose in the book?"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label htmlFor="centralClaim" className="block text-sm font-medium text-gray-700 mb-1">
                  Central Claim
                </label>
                <textarea
                  id="centralClaim"
                  value={centralClaim}
                  onChange={(e) => setCentralClaim(e.target.value)}
                  placeholder="What is the main argument this chapter makes?"
                  rows={2}
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
                  {isLoading ? 'Creating...' : 'Create Chapter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
