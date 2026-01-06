'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, X } from 'lucide-react'

interface CreateSectionButtonProps {
  chapterId: string
  bookId: string
  nextIndex: number
}

export function CreateSectionButton({ chapterId, bookId, nextIndex }: CreateSectionButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [goal, setGoal] = useState('')
  const [localClaim, setLocalClaim] = useState('')
  const router = useRouter()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('sections')
      .insert({
        chapter_id: chapterId,
        index: nextIndex,
        title: title.trim(),
        goal: goal.trim() || null,
        local_claim: localClaim.trim() || null,
      })
      .select()
      .single()

    setIsLoading(false)

    if (error) {
      console.error('Error creating section:', error)
      return
    }

    setTitle('')
    setGoal('')
    setLocalClaim('')
    setIsOpen(false)
    router.push(`/vibe/books/${bookId}/chapters/${chapterId}/sections/${data.id}`)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-amber-900 text-white px-4 py-2 rounded-lg hover:bg-amber-800 transition-colors text-sm"
      >
        <Plus className="w-4 h-4" />
        Add Section
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-amber-50 rounded-lg shadow-xl w-full max-w-md mx-4 border border-amber-200">
            <div className="flex items-center justify-between p-4 border-b border-amber-200">
              <h2 className="text-lg font-semibold text-amber-900">Create Section {nextIndex + 1}</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-amber-600 hover:text-amber-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-amber-800 mb-1">
                  Section Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter section title"
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent bg-white"
                  required
                />
              </div>

              <div>
                <label htmlFor="goal" className="block text-sm font-medium text-amber-800 mb-1">
                  Goal
                </label>
                <textarea
                  id="goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="What should this section accomplish?"
                  rows={2}
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent resize-none bg-white"
                />
              </div>

              <div>
                <label htmlFor="localClaim" className="block text-sm font-medium text-amber-800 mb-1">
                  Local Claim
                </label>
                <textarea
                  id="localClaim"
                  value={localClaim}
                  onChange={(e) => setLocalClaim(e.target.value)}
                  placeholder="What specific point does this section make?"
                  rows={2}
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent resize-none bg-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2 border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors text-amber-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !title.trim()}
                  className="flex-1 px-4 py-2 bg-amber-900 text-white rounded-lg hover:bg-amber-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating...' : 'Create Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
