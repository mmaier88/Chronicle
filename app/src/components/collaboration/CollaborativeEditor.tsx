'use client'

import { useEffect, useMemo } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

interface User {
  id: string
  name: string
  color: string
}

interface CollaborativeEditorProps {
  ydoc: Y.Doc
  provider: WebsocketProvider
  user: User
  placeholder?: string
  className?: string
  onUpdate?: (editor: Editor) => void
  editable?: boolean
}

export function CollaborativeEditor({
  ydoc,
  provider,
  user,
  placeholder = 'Start writing...',
  className = '',
  onUpdate,
  editable = true
}: CollaborativeEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
        showOnlyWhenEditable: true,
      }),
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCursor.configure({
        provider,
        user: {
          name: user.name,
          color: user.color,
        },
      }),
    ],
    editable,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-4 py-3',
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate?.(editor as Editor)
    },
  }, [ydoc, provider])

  // Update user in cursor extension when it changes
  useEffect(() => {
    if (editor) {
      editor.chain().focus().updateUser({
        name: user.name,
        color: user.color,
      }).run()
    }
  }, [editor, user.name, user.color])

  // Cleanup
  useEffect(() => {
    return () => {
      editor?.destroy()
    }
  }, [editor])

  return (
    <div className={`collaborative-editor ${className}`}>
      <EditorContent editor={editor} />

      {/* Collaboration cursor styles */}
      <style jsx global>{`
        .collaboration-cursor__caret {
          border-left: 1px solid currentColor;
          border-right: 1px solid currentColor;
          margin-left: -1px;
          margin-right: -1px;
          pointer-events: none;
          position: relative;
          word-break: normal;
        }

        .collaboration-cursor__label {
          border-radius: 3px 3px 3px 0;
          color: white;
          font-size: 12px;
          font-weight: 600;
          left: -1px;
          line-height: normal;
          padding: 0.1rem 0.3rem;
          position: absolute;
          top: -1.4em;
          user-select: none;
          white-space: nowrap;
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          color: #adb5bd;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}
