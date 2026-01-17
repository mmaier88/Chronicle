'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Book } from '@/types/chronicle'
import { Check, X } from 'lucide-react'

interface EditableBookHeaderProps {
  book: Book
}

export function EditableBookHeader({ book }: EditableBookHeaderProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(book.title)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim() || title === book.title) {
      setTitle(book.title)
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('books')
      .update({ title: title.trim() })
      .eq('id', book.id)

    setIsSaving(false)

    if (error) {
      console.error('Error saving title:', error)
      setTitle(book.title)
    }

    setIsEditing(false)
    router.refresh()
  }

  const handleCancel = () => {
    setTitle(book.title)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          autoFocus
          className="app-input"
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '2rem',
            fontWeight: 600,
            background: 'rgba(26, 39, 68, 0.3)',
            padding: '0.5rem 0.75rem',
            flex: 1,
          }}
        />
        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            padding: '0.5rem',
            background: 'rgba(34, 197, 94, 0.2)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: 8,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.5 : 1,
          }}
          title="Save"
        >
          <Check style={{ width: 20, height: 20, color: '#86efac' }} />
        </button>
        <button
          onClick={handleCancel}
          disabled={isSaving}
          style={{
            padding: '0.5rem',
            background: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.2)',
            borderRadius: 8,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.5 : 1,
          }}
          title="Cancel"
        >
          <X style={{ width: 20, height: 20, color: '#fda4af' }} />
        </button>
      </div>
    )
  }

  return (
    <h1
      className="app-heading-1"
      onClick={() => setIsEditing(true)}
      style={{
        cursor: 'pointer',
        padding: '0.25rem 0',
        borderRadius: 8,
        transition: 'background 0.2s',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212, 165, 116, 0.1)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      title="Click to edit title"
    >
      {book.title}
    </h1>
  )
}
