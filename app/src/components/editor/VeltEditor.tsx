'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useEditor, EditorContent, Editor as TiptapEditor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import {
  useCommentAnnotations,
  VeltCommentsSidebar,
  VeltPresence,
  VeltCursor,
  VeltNotificationsTool,
} from '@veltdev/react'
import {
  TiptapVeltComments,
  addComment,
  renderComments
} from '@veltdev/tiptap-velt-comments'
import { EditorToolbar } from './EditorToolbar'
import { Citation } from './extensions/Citation'
import { AISpan } from './extensions/AISpan'
import { SlashCommand } from './extensions/SlashCommand'
import { useVeltAuth } from '@/hooks/useVeltAuth'
import { MessageSquare, Users } from 'lucide-react'

interface VeltEditorProps {
  content?: string
  onChange?: (content: string) => void
  placeholder?: string
  editable?: boolean
  documentId: string
  workspaceId?: string
  onCitationClick?: () => void
  showCommentsSidebar?: boolean
}

export function VeltEditor({
  content = '',
  onChange,
  placeholder = 'Start writing...',
  editable = true,
  documentId,
  workspaceId,
  onCitationClick,
  showCommentsSidebar = true,
}: VeltEditorProps) {
  const [isAIProcessing, setIsAIProcessing] = useState(false)
  const [aiError, setAIError] = useState<string | null>(null)
  const [showPresence, setShowPresence] = useState(true)
  const editorRef = useRef<TiptapEditor | null>(null)

  // Initialize Velt authentication
  const { isAuthenticated, isLoading: isAuthLoading } = useVeltAuth({
    documentId,
    workspaceId
  })

  // Get comment annotations from Velt
  const commentAnnotations = useCommentAnnotations()

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
        const currentEditor = editorRef.current
        const { from, to } = currentEditor.state.selection

        if (from !== to) {
          currentEditor.chain().focus().deleteRange({ from, to }).insertContent(data.result).run()
        } else {
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
      // Add Velt comments extension for Tiptap
      TiptapVeltComments.configure({
        editorId: documentId,
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

  // Render comments when annotations change
  useEffect(() => {
    if (editor && commentAnnotations?.length) {
      renderComments({
        editor,
        editorId: documentId,
        commentAnnotations
      })
    }
  }, [editor, commentAnnotations, documentId])

  const handleAddComment = useCallback(async () => {
    if (editor) {
      await addComment({
        editor,
        editorId: documentId,
        context: {
          documentId,
          workspaceId,
        }
      })
    }
  }, [editor, documentId, workspaceId])

  if (!editor) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900 p-8 text-center text-gray-500">
        Loading editor...
      </div>
    )
  }

  return (
    <div className="flex gap-4">
      {/* Main Editor */}
      <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900 relative">
        {/* Toolbar with Velt presence and notifications */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <EditorToolbar editor={editor} onCitationClick={onCitationClick} />

          {/* Velt Collaboration Tools */}
          <div className="flex items-center gap-2 px-3 py-2">
            {/* Presence Toggle */}
            <button
              onClick={() => setShowPresence(!showPresence)}
              className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                showPresence ? 'text-blue-600' : 'text-gray-400'
              }`}
              title="Toggle presence indicators"
            >
              <Users className="w-4 h-4" />
            </button>

            {/* Velt Notifications */}
            {isAuthenticated && <VeltNotificationsTool />}
          </div>
        </div>

        {/* Presence Indicators */}
        {showPresence && isAuthenticated && (
          <div className="absolute top-14 right-4 z-10">
            <VeltPresence />
          </div>
        )}

        {/* Editor Content with Bubble Menu for Comments */}
        {editor && (
          <BubbleMenu
            editor={editor}
            options={{ offset: 6, placement: 'top' }}
            className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1"
          >
            <button
              onClick={handleAddComment}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm"
              title="Add comment"
            >
              <MessageSquare className="w-4 h-4" />
              Comment
            </button>
          </BubbleMenu>
        )}

        <EditorContent editor={editor} />

        {/* Velt Cursor for real-time cursor tracking */}
        {isAuthenticated && <VeltCursor />}

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

        {/* Auth Loading State */}
        {isAuthLoading && (
          <div className="absolute bottom-4 left-4 text-xs text-gray-400 dark:text-gray-500">
            Connecting to collaboration...
          </div>
        )}

        {/* Slash Command Hint */}
        {!isAIProcessing && !isAuthLoading && (
          <div className="absolute bottom-2 left-4 text-xs text-gray-400 dark:text-gray-500">
            Type / for AI commands
          </div>
        )}
      </div>

      {/* Velt Comments Sidebar */}
      {showCommentsSidebar && isAuthenticated && (
        <div className="w-80 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Comments
            </h3>
          </div>
          <VeltCommentsSidebar />
        </div>
      )}
    </div>
  )
}
