'use client'

import { useState, useEffect, use, useRef, useMemo } from 'react'
import { VeltEditor } from '@/components/editor/VeltEditor'
import { AskProject } from '@/components/ask/AskProject'
import { CitationDialog } from '@/components/editor/CitationDialog'
import { CitationPanel } from '@/components/citations/CitationPanel'
import { ArgumentPanel } from '@/components/arguments/ArgumentPanel'
import { SafetyPanel } from '@/components/safety/SafetyPanel'
import { EvidencePanel } from '@/components/evidence/EvidencePanel'
import { KeyboardShortcutsHelp } from '@/components/help/KeyboardShortcutsHelp'
import { createClient } from '@/lib/supabase/client'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import Link from 'next/link'

interface DocumentPageProps {
  params: Promise<{ id: string }>
}

interface Citation {
  id: string
  text: string
  sourceId: string
  sourceTitle: string
  pageNumber?: number
}

export default function DocumentPage({ params }: DocumentPageProps) {
  const { id } = use(params)
  const [document, setDocument] = useState<{
    id: string
    title: string
    content: string
    project_id?: string
    workspace_id?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [askPanelOpen, setAskPanelOpen] = useState(false)
  const [citationDialogOpen, setCitationDialogOpen] = useState(false)
  const [citationPanelOpen, setCitationPanelOpen] = useState(false)
  const [argumentPanelOpen, setArgumentPanelOpen] = useState(false)
  const [safetyPanelOpen, setSafetyPanelOpen] = useState(false)
  const [evidencePanelOpen, setEvidencePanelOpen] = useState(false)
  const [citations, setCitations] = useState<Citation[]>([])
  const [selectedText, setSelectedText] = useState('')
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)

  // Keyboard shortcuts
  const shortcuts = useMemo(() => [
    {
      key: 'k',
      ctrl: true,
      handler: () => setAskPanelOpen(true),
      description: 'Open Ask Project'
    },
    {
      key: 's',
      ctrl: true,
      handler: () => handleSave(),
      description: 'Save document'
    },
    {
      key: 'c',
      ctrl: true,
      shift: true,
      handler: () => setCitationPanelOpen(true),
      description: 'Open Citations'
    },
    {
      key: 'a',
      ctrl: true,
      shift: true,
      handler: () => setArgumentPanelOpen(true),
      description: 'Open Arguments'
    },
    {
      key: 'y',
      ctrl: true,
      shift: true,
      handler: () => setSafetyPanelOpen(true),
      description: 'Open Safety'
    },
    {
      key: 'e',
      ctrl: true,
      shift: true,
      handler: () => setEvidencePanelOpen(true),
      description: 'Open Evidence'
    },
    {
      key: 'Escape',
      handler: () => {
        setAskPanelOpen(false)
        setCitationPanelOpen(false)
        setArgumentPanelOpen(false)
        setSafetyPanelOpen(false)
        setEvidencePanelOpen(false)
        setCitationDialogOpen(false)
        setShortcutsHelpOpen(false)
      },
      description: 'Close panels'
    },
    {
      key: '?',
      shift: true,
      handler: () => setShortcutsHelpOpen(prev => !prev),
      description: 'Toggle keyboard shortcuts help'
    }
  ], [])

  useKeyboardShortcuts(shortcuts)

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
        // Try to fetch from database with workspace info
        const { data, error } = await supabase
          .from('documents')
          .select(`
            id,
            title,
            content,
            project_id,
            projects!inner(workspace_id)
          `)
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
          const projects = data.projects as unknown as { workspace_id: string } | { workspace_id: string }[]
          const workspaceId = Array.isArray(projects) ? projects[0]?.workspace_id : projects?.workspace_id

          setDocument({
            id: data.id,
            title: data.title,
            content: data.content || '',
            project_id: data.project_id,
            workspace_id: workspaceId
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

  const handleCitationClick = () => {
    // Get selected text from window selection
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim())
    }
    setCitationDialogOpen(true)
  }

  const handleCitationInsert = async (sourceId: string, pageNumber?: number) => {
    // Fetch source title
    const supabase = createClient()
    const { data: source } = await supabase
      .from('sources')
      .select('title')
      .eq('id', sourceId)
      .single()

    const newCitation: Citation = {
      id: `citation-${Date.now()}`,
      text: selectedText || 'Selected text',
      sourceId,
      sourceTitle: source?.title || 'Unknown Source',
      pageNumber
    }

    setCitations(prev => [...prev, newCitation])
    setSelectedText('')
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
            <div className="flex items-center space-x-1 sm:space-x-3">
              {lastSaved && (
                <span className="hidden sm:inline text-sm text-gray-500">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={() => setEvidencePanelOpen(true)}
                className="p-2 sm:px-3 sm:py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
                title="Find Evidence (Ctrl+Shift+E)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="hidden md:inline">Evidence</span>
              </button>
              <button
                onClick={() => setSafetyPanelOpen(true)}
                className="p-2 sm:px-3 sm:py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
                title="Safety Assessment (Ctrl+Shift+Y)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="hidden md:inline">Safety</span>
              </button>
              <button
                onClick={() => setArgumentPanelOpen(true)}
                className="p-2 sm:px-3 sm:py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
                title="Analyze Arguments (Ctrl+Shift+A)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="hidden md:inline">Arguments</span>
              </button>
              <button
                onClick={() => setCitationPanelOpen(true)}
                className="p-2 sm:px-3 sm:py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
                title="View Citations (Ctrl+Shift+C)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden md:inline">Citations</span>
                {citations.length > 0 && (
                  <span className="bg-purple-600 text-white text-xs rounded-full px-1.5">
                    {citations.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setAskPanelOpen(true)}
                className="p-2 sm:px-3 sm:py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
                title="Ask Project (Cmd/Ctrl+K)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden md:inline">Ask</span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-2 py-2 sm:px-4 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                title="Save (Cmd/Ctrl+S)"
              >
                {saving ? (
                  <svg className="w-4 h-4 sm:hidden animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save'}</span>
              </button>
              <button
                onClick={() => setShortcutsHelpOpen(true)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Keyboard shortcuts (Shift+?)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Editor */}
      <main className="max-w-7xl mx-auto px-4 py-8" ref={editorRef}>
        <VeltEditor
          content={document.content}
          onChange={handleContentChange}
          placeholder="Start writing your research..."
          documentId={document.id}
          workspaceId={document.workspace_id}
          onCitationClick={handleCitationClick}
          showCommentsSidebar={true}
        />
      </main>

      {/* Ask Project Sidebar */}
      <AskProject
        projectId={document.project_id}
        isOpen={askPanelOpen}
        onClose={() => setAskPanelOpen(false)}
      />

      {/* Citation Dialog */}
      <CitationDialog
        isOpen={citationDialogOpen}
        onClose={() => setCitationDialogOpen(false)}
        onInsert={handleCitationInsert}
        projectId={document.project_id}
      />

      {/* Citation Panel */}
      <CitationPanel
        citations={citations}
        documentId={document.id}
        isOpen={citationPanelOpen}
        onClose={() => setCitationPanelOpen(false)}
        onVerify={(citation) => {
          // Update citation with verification
          setCitations(prev =>
            prev.map(c => c.id === citation.id ? citation : c)
          )
        }}
        onJumpTo={(citation) => {
          // For now just close the panel
          // In future, scroll to the citation in the editor
          setCitationPanelOpen(false)
        }}
      />

      {/* Argument Panel */}
      <ArgumentPanel
        documentContent={document.content}
        documentId={document.id}
        isOpen={argumentPanelOpen}
        onClose={() => setArgumentPanelOpen(false)}
      />

      {/* Safety Panel */}
      <SafetyPanel
        documentContent={document.content}
        documentId={document.id}
        projectId={document.project_id}
        isOpen={safetyPanelOpen}
        onClose={() => setSafetyPanelOpen(false)}
      />

      {/* Evidence Panel */}
      <EvidencePanel
        projectId={document.project_id}
        selectedText={selectedText}
        isOpen={evidencePanelOpen}
        onClose={() => setEvidencePanelOpen(false)}
        onInsertCitation={(evidence) => {
          // Create a citation from the evidence
          const newCitation: Citation = {
            id: `citation-${Date.now()}`,
            text: evidence.content.substring(0, 100) + '...',
            sourceId: evidence.sourceId,
            sourceTitle: evidence.sourceTitle,
            pageNumber: evidence.pageNumber
          }
          setCitations(prev => [...prev, newCitation])
          setEvidencePanelOpen(false)
        }}
      />

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        isOpen={shortcutsHelpOpen}
        onClose={() => setShortcutsHelpOpen(false)}
      />
    </div>
  )
}
