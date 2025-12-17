'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSetDocument, VeltPresence, VeltCommentsSidebar } from '@veltdev/react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Document {
  id: string
  name: string
  content: string
  project_id: string
}

export default function DocumentPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [document, setDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Set Velt document context for collaboration
  useSetDocument(id, { documentName: document?.name || 'Document' })

  // Load document
  useEffect(() => {
    async function loadDocument() {
      // Validate UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(id)) {
        setError('Invalid document ID')
        setLoading(false)
        return
      }

      const supabase = createClient()

      // Fetch document
      const { data, error: fetchError } = await supabase
        .from('documents')
        .select('id, name, project_id')
        .eq('id', id)
        .single()

      if (fetchError || !data) {
        setError('Document not found')
        setLoading(false)
        return
      }

      // Fetch content from doc_sections
      const { data: branches } = await supabase
        .from('doc_branches')
        .select('id')
        .eq('document_id', id)
        .eq('is_main', true)
        .single()

      let content = ''
      if (branches?.id) {
        const { data: sections } = await supabase
          .from('doc_sections')
          .select('content_text')
          .eq('branch_id', branches.id)
          .order('order_index')

        content = sections?.map(s => s.content_text || '').join('\n\n') || ''
      }

      setDocument({
        id: data.id,
        name: data.name,
        content,
        project_id: data.project_id,
      })
      setLoading(false)
    }

    loadDocument()
  }, [id])

  // Auto-save content
  const handleContentChange = async (newContent: string) => {
    if (!document) return

    setDocument({ ...document, content: newContent })

    // Debounced save would go here
    // For now, we'll save on blur
  }

  const saveContent = async () => {
    if (!document) return

    setSaving(true)
    const supabase = createClient()

    // Get main branch
    const { data: branch } = await supabase
      .from('doc_branches')
      .select('id')
      .eq('document_id', id)
      .eq('is_main', true)
      .single()

    if (branch?.id) {
      // Update or create section
      const { data: existingSection } = await supabase
        .from('doc_sections')
        .select('id')
        .eq('branch_id', branch.id)
        .eq('order_index', 0)
        .single()

      if (existingSection) {
        await supabase
          .from('doc_sections')
          .update({
            content_text: document.content,
            content_json: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: document.content }] }] },
          })
          .eq('id', existingSection.id)
      } else {
        await supabase
          .from('doc_sections')
          .insert({
            branch_id: branch.id,
            order_index: 0,
            content_text: document.content,
            content_json: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: document.content }] }] },
          })
      }
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-500">{error || 'Document not found'}</p>
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {document.name}
            </h1>
            {saving && (
              <span className="text-sm text-gray-500">Saving...</span>
            )}
          </div>

          {/* Velt Presence - shows who's viewing */}
          <div className="flex items-center gap-4">
            <VeltPresence />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 flex gap-6">
        {/* Editor */}
        <div className="flex-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 min-h-[600px]">
            <textarea
              className="w-full h-full min-h-[600px] p-6 bg-transparent resize-none focus:outline-none text-gray-900 dark:text-white text-lg leading-relaxed"
              placeholder="Start writing..."
              value={document.content}
              onChange={(e) => handleContentChange(e.target.value)}
              onBlur={saveContent}
            />
          </div>
        </div>

        {/* Comments Sidebar */}
        <div className="w-80 hidden lg:block">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 sticky top-20">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">Comments</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Select text to add a comment
              </p>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              <VeltCommentsSidebar />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
