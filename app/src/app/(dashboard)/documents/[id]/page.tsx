'use client'

import { useState, useEffect, use } from 'react'
import { Editor } from '@/components/editor'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface DocumentPageProps {
  params: Promise<{ id: string }>
}

export default function DocumentPage({ params }: DocumentPageProps) {
  const { id } = use(params)
  const [document, setDocument] = useState<{
    id: string
    title: string
    content: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  useEffect(() => {
    async function loadDocument() {
      const supabase = createClient()

      // For now, create a mock document if it doesn't exist
      // Later this will fetch from the database
      if (id === 'new') {
        setDocument({
          id: 'new',
          title: 'Untitled Document',
          content: '<p>Start writing your research...</p>'
        })
      } else {
        // Try to fetch from database
        const { data, error } = await supabase
          .from('documents')
          .select('id, title, content')
          .eq('id', id)
          .single()

        if (error || !data) {
          // Create demo document for testing
          setDocument({
            id,
            title: 'Demo Document',
            content: `
              <h1>Welcome to ResearchBase</h1>
              <p>This is your AI-powered research environment. Start writing and use the toolbar above to format your text.</p>
              <h2>Features</h2>
              <ul>
                <li><strong>Rich text editing</strong> - Format your text with headings, lists, and more</li>
                <li><strong>AI assistance</strong> - Use slash commands to summarize, rewrite, or expand text</li>
                <li><strong>Citations</strong> - Link your claims to source evidence</li>
                <li><strong>Collaboration</strong> - Work together in real-time</li>
              </ul>
              <blockquote>
                <p>"The best research is collaborative research." - ResearchBase</p>
              </blockquote>
              <h2>Getting Started</h2>
              <p>Try using the toolbar above or these keyboard shortcuts:</p>
              <ul>
                <li><code>Cmd+B</code> for <strong>bold</strong></li>
                <li><code>Cmd+I</code> for <em>italic</em></li>
                <li><code>Cmd+U</code> for <u>underline</u></li>
              </ul>
            `
          })
        } else {
          setDocument({
            id: data.id,
            title: data.title,
            content: data.content || ''
          })
        }
      }

      setLoading(false)
    }

    loadDocument()
  }, [id])

  const handleContentChange = async (content: string) => {
    if (!document) return

    setDocument({ ...document, content })

    // Auto-save with debounce would go here
    // For now, just update the state
  }

  const handleSave = async () => {
    if (!document) return

    setSaving(true)

    // Simulate save - in production this would save to Supabase
    await new Promise(resolve => setTimeout(resolve, 500))

    setLastSaved(new Date())
    setSaving(false)
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!document) return
    setDocument({ ...document, title: e.target.value })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading document...</div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Document not found</h2>
          <Link href="/dashboard" className="mt-4 text-blue-600 hover:text-blue-500">
            Return to dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <input
                type="text"
                value={document.title}
                onChange={handleTitleChange}
                className="text-lg font-semibold text-gray-900 dark:text-white bg-transparent border-none focus:outline-none focus:ring-0 w-64"
                placeholder="Document title"
              />
            </div>
            <div className="flex items-center space-x-3">
              {lastSaved && (
                <span className="text-sm text-gray-500">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Editor */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Editor
          content={document.content}
          onChange={handleContentChange}
          placeholder="Start writing your research..."
        />
      </main>
    </div>
  )
}
