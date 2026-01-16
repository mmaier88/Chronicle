'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Book, Constitution } from '@/types/chronicle'
import { Lock, Unlock, Save, AlertCircle, Loader2 } from 'lucide-react'

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
  const [saveSuccess, setSaveSuccess] = useState(false)
  const router = useRouter()

  const updateField = (key: keyof Constitution, value: string) => {
    setConstitution(prev => ({ ...prev, [key]: value || null }))
    setHasChanges(true)
    setSaveSuccess(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
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
    setSaveSuccess(true)
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
    <div>
      {/* Success banner */}
      {saveSuccess && (
        <div style={{
          marginBottom: '1rem',
          padding: '1rem',
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: 12,
          color: '#86efac',
          fontSize: '0.875rem'
        }}>
          Changes saved successfully
        </div>
      )}

      {/* Header with lock status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 className="app-heading-3">Constitution</h2>
        {book.constitution_locked ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', color: '#86efac' }}>
            <Lock style={{ width: 14, height: 14 }} />
            Locked
          </span>
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', color: 'var(--amber-warm)' }}>
            <Unlock style={{ width: 14, height: 14 }} />
            Draft
          </span>
        )}
      </div>

      {/* Info banner for unlocked constitutions */}
      {!book.constitution_locked && (
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          padding: '1rem',
          marginBottom: '1.5rem',
          background: 'rgba(212, 165, 116, 0.1)',
          border: '1px solid rgba(212, 165, 116, 0.2)',
          borderRadius: 12,
        }}>
          <AlertCircle style={{ width: 16, height: 16, color: 'var(--amber-warm)', flexShrink: 0, marginTop: '0.125rem' }} />
          <p className="app-body-sm">
            The Constitution defines your book&apos;s foundational principles. Fill in all fields and lock it to begin writing chapters.
          </p>
        </div>
      )}

      {/* Fields */}
      <div className="app-card" style={{ padding: 0, overflow: 'hidden' }}>
        {CONSTITUTION_FIELDS.map(({ key, label, placeholder }, idx) => (
          <div
            key={key}
            style={{
              padding: '1.25rem',
              borderBottom: idx < CONSTITUTION_FIELDS.length - 1 ? '1px solid rgba(250, 246, 237, 0.06)' : 'none'
            }}
          >
            <label className="app-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
              {label}
            </label>
            {book.constitution_locked ? (
              <p className="app-body" style={{ opacity: constitution[key] ? 1 : 0.5 }}>
                {constitution[key] || 'Not set'}
              </p>
            ) : (
              <textarea
                value={constitution[key] || ''}
                onChange={(e) => updateField(key, e.target.value)}
                placeholder={placeholder}
                rows={2}
                disabled={isSaving || isLocking}
                className="app-textarea"
                style={{ background: 'rgba(26, 39, 68, 0.3)', resize: 'none', width: '100%' }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      {!book.constitution_locked && (
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="app-button-secondary"
            style={{
              flex: 1,
              justifyContent: 'center',
              opacity: isSaving || !hasChanges ? 0.5 : 1,
              cursor: isSaving || !hasChanges ? 'not-allowed' : 'pointer',
            }}
          >
            {isSaving ? (
              <>
                <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                Saving...
              </>
            ) : (
              <>
                <Save style={{ width: 16, height: 16 }} />
                Save Draft
              </>
            )}
          </button>
          <button
            onClick={handleLock}
            disabled={isLocking || !isComplete}
            className="app-button-primary"
            style={{
              flex: 1,
              justifyContent: 'center',
              opacity: isLocking || !isComplete ? 0.5 : 1,
              cursor: isLocking || !isComplete ? 'not-allowed' : 'pointer',
            }}
          >
            {isLocking ? (
              <>
                <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                Locking...
              </>
            ) : (
              <>
                <Lock style={{ width: 16, height: 16 }} />
                Lock Constitution
              </>
            )}
          </button>
        </div>
      )}

      {!book.constitution_locked && !isComplete && (
        <p className="app-body-sm" style={{ marginTop: '0.75rem', textAlign: 'center', opacity: 0.6 }}>
          Fill in all fields to enable locking
        </p>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
