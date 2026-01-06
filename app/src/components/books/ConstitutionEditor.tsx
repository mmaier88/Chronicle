'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Book, Constitution } from '@/types/chronicle'
import { Lock, Unlock, Save, AlertCircle } from 'lucide-react'

interface ConstitutionEditorProps {
  book: Book
}

const CONSTITUTION_FIELDS: { key: keyof Constitution; label: string; placeholder: string }[] = [
  { key: 'central_thesis', label: 'Central Thesis', placeholder: 'What is the main argument or insight of this book?' },
  { key: 'worldview_frame', label: 'Worldview Frame', placeholder: 'What perspective or lens does this book use?' },
  { key: 'narrative_voice', label: 'Narrative Voice', placeholder: 'What tone and style defines the writing?' },
  { key: 'what_book_is_against', label: 'What Book Is Against', placeholder: 'What ideas or positions does this book oppose?' },
  { key: 'what_book_refuses_to_do', label: 'What Book Refuses To Do', placeholder: 'What approaches or compromises are off-limits?' },
  { key: 'ideal_reader', label: 'Ideal Reader', placeholder: 'Who is this book written for?' },
  { key: 'taboo_simplifications', label: 'Taboo Simplifications', placeholder: 'What oversimplifications should be avoided?' },
]

export function ConstitutionEditor({ book }: ConstitutionEditorProps) {
  const [constitution, setConstitution] = useState<Constitution>(book.constitution_json)
  const [isSaving, setIsSaving] = useState(false)
  const [isLocking, setIsLocking] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const router = useRouter()

  const updateField = (key: keyof Constitution, value: string) => {
    setConstitution(prev => ({ ...prev, [key]: value || null }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('books')
      .update({ constitution_json: constitution })
      .eq('id', book.id)

    setIsSaving(false)

    if (error) {
      console.error('Error saving constitution:', error)
      return
    }

    setHasChanges(false)
    router.refresh()
  }

  const handleLock = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to lock the Constitution? This action cannot be undone and will finalize your book\'s foundational principles.'
    )

    if (!confirmed) return

    setIsLocking(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('books')
      .update({
        constitution_json: constitution,
        constitution_locked: true,
        constitution_locked_at: new Date().toISOString(),
      })
      .eq('id', book.id)

    setIsLocking(false)

    if (error) {
      console.error('Error locking constitution:', error)
      return
    }

    router.refresh()
  }

  const isComplete = Object.values(constitution).every(v => v !== null && v !== '')

  return (
    <div className="bg-white/80 rounded-lg border border-amber-200/60 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-amber-900">Constitution</h2>
        {book.constitution_locked ? (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <Lock className="w-4 h-4" />
            Locked
          </span>
        ) : (
          <span className="flex items-center gap-1 text-sm text-amber-600">
            <Unlock className="w-4 h-4" />
            Draft
          </span>
        )}
      </div>

      {!book.constitution_locked && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <div className="flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              The Constitution defines your book&apos;s foundational principles. Fill in all fields and lock it to begin writing chapters.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {CONSTITUTION_FIELDS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-amber-800 mb-1">
              {label}
            </label>
            {book.constitution_locked ? (
              <p className="text-sm text-amber-700 bg-amber-50/50 p-3 rounded-lg">
                {constitution[key] || <span className="text-amber-400">Not set</span>}
              </p>
            ) : (
              <textarea
                value={constitution[key] || ''}
                onChange={(e) => updateField(key, e.target.value)}
                placeholder={placeholder}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent resize-none bg-white"
              />
            )}
          </div>
        ))}
      </div>

      {!book.constitution_locked && (
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-amber-800"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={handleLock}
            disabled={isLocking || !isComplete}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-900 text-white rounded-lg hover:bg-amber-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Lock className="w-4 h-4" />
            {isLocking ? 'Locking...' : 'Lock Constitution'}
          </button>
        </div>
      )}

      {!book.constitution_locked && !isComplete && (
        <p className="text-xs text-amber-600/70 mt-3 text-center">
          Fill in all fields to enable locking
        </p>
      )}
    </div>
  )
}
