'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Section, Book, Chapter } from '@/types/chronicle'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { ClaimBlock, MotifBlock, ThreadBlock, NoteBlock } from '@/components/editor/extensions'
import {
  Save, CheckCircle, Info, Bold, Italic, List, ListOrdered, Heading2,
  Sparkles, Target, Lightbulb, StickyNote, AlertTriangle, Loader2
} from 'lucide-react'

interface SectionEditorProps {
  section: Section
  book: Book
  chapter: Chapter
}

export function SectionEditor({ section, book, chapter }: SectionEditorProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [isPromoting, setIsPromoting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const router = useRouter()

  const editor = useEditor({
    extensions: [
      StarterKit,
      ClaimBlock,
      MotifBlock,
      ThreadBlock,
      NoteBlock,
    ],
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

  const handleGenerate = async () => {
    if (!editor || section.status === 'canonical') return

    setIsGenerating(true)

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: book.id,
          chapterId: chapter.id,
          sectionId: section.id,
          type: 'section',
        }),
      })

      if (!response.ok) throw new Error('Generation failed')

      const data = await response.json()
      const result = data.result

      if (typeof result === 'object' && result.prose) {
        // Insert generated prose
        editor.commands.setContent(result.prose)

        // If claims were suggested, show them
        if (result.claims && result.claims.length > 0) {
          console.log('Suggested claims:', result.claims)
        }
      } else if (typeof result === 'string') {
        editor.commands.setContent(result)
      }
    } catch (error) {
      console.error('Generation error:', error)
    }

    setIsGenerating(false)
  }

  const handleExtract = async () => {
    if (!editor) return

    const text = editor.getText()
    if (!text.trim()) return

    setIsExtracting(true)

    try {
      const response = await fetch('/api/ai/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: book.id,
          sectionId: section.id,
          content: text,
        }),
      })

      if (!response.ok) throw new Error('Extraction failed')

      const data = await response.json()
      console.log('Extracted semantic blocks:', data.result)
      // In a full implementation, we'd show these in a sidebar
      alert(`Extracted: ${data.result.claims?.length || 0} claims, ${data.result.motifs?.length || 0} motifs, ${data.result.threads?.length || 0} threads`)
    } catch (error) {
      console.error('Extraction error:', error)
    }

    setIsExtracting(false)
  }

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
            <div className="flex items-center justify-between p-2 border-b border-gray-200">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('bold') ? 'bg-gray-100' : ''}`}
                  title="Bold"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('italic') ? 'bg-gray-100' : ''}`}
                  title="Italic"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-100' : ''}`}
                  title="Heading"
                >
                  <Heading2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('bulletList') ? 'bg-gray-100' : ''}`}
                  title="Bullet List"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('orderedList') ? 'bg-gray-100' : ''}`}
                  title="Numbered List"
                >
                  <ListOrdered className="w-4 h-4" />
                </button>

                <div className="w-px h-6 bg-gray-200 mx-2" />

                <button
                  onClick={() => editor.chain().focus().setClaimBlock({ stance: 'pro' }).run()}
                  className="p-2 rounded hover:bg-green-100 text-green-700"
                  title="Add Claim Block"
                >
                  <Target className="w-4 h-4" />
                </button>
                <button
                  onClick={() => editor.chain().focus().setThreadBlock({ status: 'open' }).run()}
                  className="p-2 rounded hover:bg-amber-100 text-amber-700"
                  title="Add Thread Block"
                >
                  <Lightbulb className="w-4 h-4" />
                </button>
                <button
                  onClick={() => editor.chain().focus().setNoteBlock({ noteType: 'idea' }).run()}
                  className="p-2 rounded hover:bg-yellow-100 text-yellow-700"
                  title="Add Note (not embedded)"
                >
                  <StickyNote className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExtract}
                  disabled={isExtracting}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm border border-purple-300 text-purple-700 rounded hover:bg-purple-50 disabled:opacity-50"
                  title="Extract claims, motifs, and threads"
                >
                  {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                  Extract
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  title="AI Generate Content"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Generate
                </button>
              </div>
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

        <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
          <h3 className="font-semibold text-amber-900 mb-2 text-sm">Constitution Reminder</h3>
          <p className="text-xs text-amber-800">
            <strong>Voice:</strong> {book.constitution_json?.narrative_voice || 'Not set'}
          </p>
          <p className="text-xs text-amber-800 mt-1">
            <strong>Avoid:</strong> {book.constitution_json?.taboo_simplifications || 'Not set'}
          </p>
        </div>

        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">Block Types</h4>
              <ul className="text-xs text-blue-800 mt-2 space-y-1">
                <li><Target className="w-3 h-3 inline" /> <strong>Claim:</strong> Key assertions (embedded)</li>
                <li><Lightbulb className="w-3 h-3 inline" /> <strong>Thread:</strong> Open loops (tracked)</li>
                <li><StickyNote className="w-3 h-3 inline" /> <strong>Note:</strong> Scratchpad (NOT embedded)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
