'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Section, Book, Chapter } from '@/types/chronicle'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Save, CheckCircle, Info, Bold, Italic, List, ListOrdered, Heading2 } from 'lucide-react'

interface SectionEditorProps {
  section: Section
  book: Book
  chapter: Chapter
}

export function SectionEditor({ section, book, chapter }: SectionEditorProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [isPromoting, setIsPromoting] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const router = useRouter()

  const editor = useEditor({
    extensions: [StarterKit],
    content: section.content_json && Object.keys(section.content_json).length > 0
      ? section.content_json
      : '<p>Start writing your section here...</p>',
    editorProps: {
      attributes: {
        class: 'prose prose-gray max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
    editable: section.status !== 'canonical',
  })

  const handleSave = useCallback(async () => {
    if (!editor || section.status === 'canonical') return

    setIsSaving(true)
    const supabase = createClient()

    const contentJson = editor.getJSON()
    const contentText = editor.getText()

    const { error } = await supabase
      .from('sections')
      .update({
        content_json: contentJson,
        content_text: contentText,
      })
      .eq('id', section.id)

    setIsSaving(false)

    if (error) {
      console.error('Error saving section:', error)
      return
    }

    setLastSaved(new Date())
  }, [editor, section.id, section.status])

  const handlePromote = async () => {
    if (!editor || section.status === 'canonical') return

    const confirmed = window.confirm(
      'Are you sure you want to promote this section to canonical? This will mark the content as final and make it eligible for embedding.'
    )

    if (!confirmed) return

    setIsPromoting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const contentJson = editor.getJSON()
    const contentText = editor.getText()

    const { error } = await supabase
      .from('sections')
      .update({
        content_json: contentJson,
        content_text: contentText,
        status: 'canonical',
        promoted_at: new Date().toISOString(),
        promoted_by: user?.id,
      })
      .eq('id', section.id)

    setIsPromoting(false)

    if (error) {
      console.error('Error promoting section:', error)
      return
    }

    router.refresh()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-4">
      <div className="lg:col-span-3">
        <div className="bg-white rounded-lg border border-gray-200">
          {section.status !== 'canonical' && editor && (
            <div className="flex items-center gap-1 p-2 border-b border-gray-200">
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('bold') ? 'bg-gray-100' : ''}`}
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('italic') ? 'bg-gray-100' : ''}`}
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-100' : ''}`}
              >
                <Heading2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('bulletList') ? 'bg-gray-100' : ''}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('orderedList') ? 'bg-gray-100' : ''}`}
              >
                <ListOrdered className="w-4 h-4" />
              </button>
            </div>
          )}

          <EditorContent editor={editor} />

          {section.status !== 'canonical' && (
            <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-500">
                {lastSaved && `Last saved ${lastSaved.toLocaleTimeString()}`}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  onClick={handlePromote}
                  disabled={isPromoting}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  {isPromoting ? 'Promoting...' : 'Promote to Canonical'}
                </button>
              </div>
            </div>
          )}

          {section.status === 'canonical' && (
            <div className="p-4 border-t border-gray-200 bg-green-50">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">This section has been promoted to canonical</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Section Details</h3>

          {section.goal && (
            <div className="mb-3">
              <label className="text-xs font-medium text-gray-500 uppercase">Goal</label>
              <p className="text-sm text-gray-700 mt-1">{section.goal}</p>
            </div>
          )}

          {section.local_claim && (
            <div className="mb-3">
              <label className="text-xs font-medium text-gray-500 uppercase">Local Claim</label>
              <p className="text-sm text-gray-700 mt-1">{section.local_claim}</p>
            </div>
          )}

          {section.constraints && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Constraints</label>
              <p className="text-sm text-gray-700 mt-1">{section.constraints}</p>
            </div>
          )}

          {!section.goal && !section.local_claim && !section.constraints && (
            <p className="text-sm text-gray-500">No details set for this section.</p>
          )}
        </div>

        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">Writing Tips</h4>
              <ul className="text-xs text-blue-800 mt-2 space-y-1">
                <li>Keep the section focused on its local claim</li>
                <li>Save frequently to preserve your work</li>
                <li>Only promote when the content is final</li>
                <li>Canonical sections become part of the book&apos;s permanent record</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
