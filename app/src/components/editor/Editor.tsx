'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useEditor, EditorContent, Editor as TiptapEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import { EditorToolbar } from './EditorToolbar'
import { Citation } from './extensions/Citation'
import { AISpan } from './extensions/AISpan'
import { SlashCommand } from './extensions/SlashCommand'

interface EditorProps {
  content?: string
  onChange?: (content: string) => void
  placeholder?: string
  editable?: boolean
  documentId?: string
  onCitationClick?: () => void
}

export function Editor({
  content = '',
  onChange,
  placeholder = 'Start writing...',
  editable = true,
  documentId,
  onCitationClick
}: EditorProps) {
  const [isAIProcessing, setIsAIProcessing] = useState(false)
  const [aiError, setAIError] = useState<string | null>(null)
  const editorRef = useRef<TiptapEditor | null>(null)

  const handleAICommand = useCallback(async (action: string, text: string) => {
    if (!text.trim()) {
      setAIError('Please select some text or write content first')
      setTimeout(() => setAIError(null), 3000)
      return
    }

    setIsAIProcessing(true)
    setAIError(null)

    try {
      const response = await fetch('/api/ai/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          text: text.trim(),
          documentId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'AI request failed')
      }

      if (data.result && editorRef.current) {
        // Insert the AI result at cursor position or replace selection
        const currentEditor = editorRef.current
        const { from, to } = currentEditor.state.selection

        if (from !== to) {
          // Replace selection
          currentEditor.chain().focus().deleteRange({ from, to }).insertContent(data.result).run()
        } else {
          // Insert at cursor with AI span marking
          currentEditor.chain().focus().insertContent(
            `<span data-ai-span="true" data-ai-job-id="${Date.now()}" data-ai-model="claude-sonnet-4-20250514" data-ai-action="${action}" data-ai-timestamp="${new Date().toISOString()}">${data.result}</span>`
          ).run()
        }
      }
    } catch (error) {
      console.error('AI command error:', error)
      setAIError(error instanceof Error ? error.message : 'AI request failed')
      setTimeout(() => setAIError(null), 5000)
    } finally {
      setIsAIProcessing(false)
    }
  }, [documentId])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-800 underline cursor-pointer',
        },
      }),
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Citation,
      AISpan,
      SlashCommand.configure({
        onCommand: handleAICommand
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-4 py-3',
      },
    },
  })

  // Keep ref in sync with editor
  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  if (!editor) {
    return null
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900 relative">
      <EditorToolbar editor={editor} onCitationClick={onCitationClick} />
      <EditorContent editor={editor} />

      {/* AI Processing Indicator */}
      {isAIProcessing && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg shadow-lg">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          AI is writing...
        </div>
      )}

      {/* AI Error Message */}
      {aiError && (
        <div className="absolute bottom-4 right-4 px-3 py-2 bg-red-600 text-white text-sm rounded-lg shadow-lg">
          {aiError}
        </div>
      )}

      {/* Slash Command Hint */}
      {!isAIProcessing && (
        <div className="absolute bottom-2 left-4 text-xs text-gray-400 dark:text-gray-500">
          Type / for AI commands
        </div>
      )}
    </div>
  )
}
