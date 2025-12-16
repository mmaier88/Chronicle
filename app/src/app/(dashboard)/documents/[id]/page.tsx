'use client'

import { useState, useEffect, use, useRef, useMemo } from 'react'
import { VeltEditor } from '@/components/editor/VeltEditor'
import { AskProject } from '@/components/ask/AskProject'
import { CitationDialog } from '@/components/editor/CitationDialog'
import { CitationPanel } from '@/components/citations/CitationPanel'
import { CitationExportPanel } from '@/components/citations/CitationExportPanel'
import { ArgumentPanel } from '@/components/arguments/ArgumentPanel'
import { GuardrailsPanel } from '@/components/guardrails/GuardrailsPanel'
import { SafetyPanel } from '@/components/safety/SafetyPanel'
import { EvidencePanel } from '@/components/evidence/EvidencePanel'
import { KeyboardShortcutsHelp } from '@/components/help/KeyboardShortcutsHelp'
import { VersionHistoryPanel, BranchSelector, DiffViewer, MergeRequestPanel } from '@/components/versioning'
import { DocumentTreeSidebar, TableOfContents } from '@/components/navigation'
import { PDFViewerModal } from '@/components/pdf/PDFViewerModal'
import { VeltPresenceDisplay } from '@/components/collaboration/VeltPresenceDisplay'
import { createClient } from '@/lib/supabase/client'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()
  const [document, setDocument] = useState<{
    id: string
    title: string
    content: string
    project_id?: string
    workspace_id?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
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
  const [versionPanelOpen, setVersionPanelOpen] = useState(false)
  const [createVersionOpen, setCreateVersionOpen] = useState(false)
  const [versionMessage, setVersionMessage] = useState('')
  const [creatingVersion, setCreatingVersion] = useState(false)
  const [versionRefreshKey, setVersionRefreshKey] = useState(0)
  const [currentBranchId, setCurrentBranchId] = useState<string | undefined>()
  const [createBranchOpen, setCreateBranchOpen] = useState(false)
  const [branchName, setBranchName] = useState('')
  const [creatingBranch, setCreatingBranch] = useState(false)
  const [diffViewerOpen, setDiffViewerOpen] = useState(false)
  const [compareFromId, setCompareFromId] = useState<string | null>(null)
  const [compareToId, setCompareToId] = useState<string | null>(null)
  const [mergePanelOpen, setMergePanelOpen] = useState(false)
  const [createMergeRequestOpen, setCreateMergeRequestOpen] = useState(false)
  const [mrTitle, setMrTitle] = useState('')
  const [mrDescription, setMrDescription] = useState('')
  const [mrTargetBranch, setMrTargetBranch] = useState<string | null>(null)
  const [creatingMergeRequest, setCreatingMergeRequest] = useState(false)
  const [docTreeOpen, setDocTreeOpen] = useState(false)
  const [tocOpen, setTocOpen] = useState(false)
  const [guardrailsPanelOpen, setGuardrailsPanelOpen] = useState(false)
  const [citationExportOpen, setCitationExportOpen] = useState(false)
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [pdfViewerSource, setPdfViewerSource] = useState<{ url: string; title: string; page?: number } | null>(null)
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
      key: 'h',
      ctrl: true,
      shift: true,
      handler: () => setVersionPanelOpen(true),
      description: 'Open Version History'
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
        setVersionPanelOpen(false)
        setCreateVersionOpen(false)
        setDiffViewerOpen(false)
        setMergePanelOpen(false)
        setCreateMergeRequestOpen(false)
        setDocTreeOpen(false)
        setTocOpen(false)
        setGuardrailsPanelOpen(false)
        setCitationExportOpen(false)
        setPdfViewerOpen(false)
      },
      description: 'Close panels'
    },
    {
      key: 'g',
      ctrl: true,
      shift: true,
      handler: () => setGuardrailsPanelOpen(prev => !prev),
      description: 'Toggle Guardrails'
    },
    {
      key: 'd',
      ctrl: true,
      shift: true,
      handler: () => setDocTreeOpen(prev => !prev),
      description: 'Toggle document tree'
    },
    {
      key: 't',
      ctrl: true,
      shift: true,
      handler: () => setTocOpen(prev => !prev),
      description: 'Toggle table of contents'
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
      // Handle /documents/new - redirect to dashboard
      if (id === 'new' || id === 'demo') {
        router.replace('/dashboard')
        return
      }

      // Validate UUID format to avoid DB errors
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(id)) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const supabase = createClient()

      // Fetch from database with workspace info
      const { data, error } = await supabase
        .from('documents')
        .select(`
          id,
          name,
          project_id,
          projects!inner(workspace_id)
        `)
        .eq('id', id)
        .single()

      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const projects = data.projects as unknown as { workspace_id: string } | { workspace_id: string }[]
      const workspaceId = Array.isArray(projects) ? projects[0]?.workspace_id : projects?.workspace_id

      // SECURITY: Verify user has access to this document's workspace
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }

      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .single()

      if (!membership) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setDocument({
        id: data.id,
        title: data.name, // DB column is 'name', UI uses 'title'
        content: '', // Content is stored in doc_sections
        project_id: data.project_id,
        workspace_id: workspaceId
      })

      setLoading(false)
    }

    loadDocument()
  }, [id, router])

  const handleContentChange = async (content: string) => {
    if (!document) return

    setDocument({ ...document, content })

    // Auto-save with debounce would go here
    // For now, just update the state
  }

  const handleSave = async () => {
    if (!document) return

    setSaving(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('documents')
        .update({
          name: document.title, // DB column is 'name'
          updated_at: new Date().toISOString()
        })
        .eq('id', document.id)

      if (error) {
        console.error('Save failed:', error)
        alert('Failed to save document. Please try again.')
        return
      }

      setLastSaved(new Date())
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save document. Please try again.')
    } finally {
      setSaving(false)
    }
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

  const handleCreateVersion = async () => {
    if (!document || creatingVersion) return

    setCreatingVersion(true)
    try {
      const response = await fetch(`/api/documents/${document.id}/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: document.content,
          commit_message: versionMessage || `Version saved on ${new Date().toLocaleString()}`
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create version')
      }

      // Refresh version history
      setVersionRefreshKey(prev => prev + 1)
      setCreateVersionOpen(false)
      setVersionMessage('')
      setVersionPanelOpen(true)
    } catch (error) {
      console.error('Failed to create version:', error)
      alert(error instanceof Error ? error.message : 'Failed to create version')
    } finally {
      setCreatingVersion(false)
    }
  }

  const handleCreateBranch = async () => {
    if (!document || creatingBranch || !branchName.trim()) return

    setCreatingBranch(true)
    try {
      const response = await fetch(`/api/documents/${document.id}/branches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: branchName.trim(),
          parent_branch_id: currentBranchId
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create branch')
      }

      const data = await response.json()
      setCurrentBranchId(data.branch.id)
      setCreateBranchOpen(false)
      setBranchName('')
    } catch (error) {
      console.error('Failed to create branch:', error)
      alert(error instanceof Error ? error.message : 'Failed to create branch')
    } finally {
      setCreatingBranch(false)
    }
  }

  const handleRestoreVersion = async (snapshotId: string) => {
    if (!document) return

    try {
      const response = await fetch(`/api/documents/${document.id}/snapshots/${snapshotId}`)
      if (!response.ok) throw new Error('Failed to fetch snapshot')

      const data = await response.json()
      if (data.snapshot?.crdt_state) {
        // Restore content from snapshot
        const content = typeof data.snapshot.crdt_state === 'string'
          ? data.snapshot.crdt_state
          : JSON.stringify(data.snapshot.crdt_state)
        setDocument({ ...document, content })
        setVersionPanelOpen(false)
      }
    } catch (error) {
      console.error('Failed to restore version:', error)
      alert('Failed to restore version')
    }
  }

  const handleCompareSnapshots = (fromSnapshotId: string, toSnapshotId: string) => {
    setCompareFromId(fromSnapshotId)
    setCompareToId(toSnapshotId)
    setDiffViewerOpen(true)
    setVersionPanelOpen(false)
  }

  const handleCreateMergeRequest = async () => {
    if (!document || creatingMergeRequest || !mrTitle.trim() || !currentBranchId) return

    setCreatingMergeRequest(true)
    try {
      const response = await fetch(`/api/documents/${document.id}/merge-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: mrTitle.trim(),
          description: mrDescription.trim() || null,
          source_branch_id: currentBranchId,
          target_branch_id: mrTargetBranch || null, // null = main branch
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create merge request')
      }

      setCreateMergeRequestOpen(false)
      setMrTitle('')
      setMrDescription('')
      setMrTargetBranch(null)
      setMergePanelOpen(true)
    } catch (error) {
      console.error('Failed to create merge request:', error)
      alert(error instanceof Error ? error.message : 'Failed to create merge request')
    } finally {
      setCreatingMergeRequest(false)
    }
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

  const handleViewSource = async (sourceId: string, pageNumber?: number) => {
    try {
      const supabase = createClient()
      const { data: source, error } = await supabase
        .from('sources')
        .select('id, title, file_path, file_type')
        .eq('id', sourceId)
        .single()

      if (error || !source) {
        console.error('Failed to fetch source:', error)
        return
      }

      // Get signed URL for the file
      if (source.file_path) {
        const { data: signedUrl, error: urlError } = await supabase.storage
          .from('sources')
          .createSignedUrl(source.file_path, 3600) // 1 hour expiry

        if (urlError || !signedUrl?.signedUrl) {
          console.error('Failed to get signed URL:', urlError)
          return
        }

        setPdfViewerSource({
          url: signedUrl.signedUrl,
          title: source.title,
          page: pageNumber
        })
        setPdfViewerOpen(true)
      }
    } catch (error) {
      console.error('Error opening source:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading document...</div>
      </div>
    )
  }

  if (notFound || !document) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 mx-auto mb-6 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Document Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The document you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Go to Dashboard
            </Link>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 font-medium"
            >
              Go Back
            </button>
          </div>
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
              <button
                onClick={() => setDocTreeOpen(prev => !prev)}
                className={`p-2 rounded-lg transition-colors ${
                  docTreeOpen
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title="Document tree (Ctrl+Shift+D)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </button>
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
                className="text-lg font-semibold text-gray-900 dark:text-white bg-transparent border-none focus:outline-none focus:ring-0 w-48"
                placeholder="Document title"
              />
              <BranchSelector
                documentId={document.id}
                currentBranchId={currentBranchId}
                onBranchChange={setCurrentBranchId}
                onCreateBranch={() => setCreateBranchOpen(true)}
              />
            </div>
            <div className="flex items-center space-x-1 sm:space-x-3">
              {lastSaved && (
                <span className="hidden sm:inline text-sm text-gray-500">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
              <VeltPresenceDisplay showCursors={true} maxAvatars={4} />
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
                onClick={() => setGuardrailsPanelOpen(true)}
                className="p-2 sm:px-3 sm:py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
                title="AI Guardrails (Ctrl+Shift+G)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="hidden md:inline">Guardrails</span>
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
                onClick={() => setVersionPanelOpen(true)}
                className="p-2 sm:px-3 sm:py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
                title="Version History (Ctrl+Shift+H)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden md:inline">History</span>
              </button>
              <button
                onClick={() => setMergePanelOpen(true)}
                className="p-2 sm:px-3 sm:py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
                title="Merge Requests"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span className="hidden md:inline">Merge</span>
              </button>
              <button
                onClick={() => setCreateVersionOpen(true)}
                className="p-2 sm:px-3 sm:py-2 text-sm font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 rounded-lg hover:bg-green-200 dark:hover:bg-green-800/40 flex items-center gap-2"
                title="Create Version"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="hidden md:inline">Version</span>
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
                onClick={() => setTocOpen(prev => !prev)}
                className={`p-2 rounded-lg transition-colors ${
                  tocOpen
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title="Table of contents (Ctrl+Shift+T)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
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
        onViewSource={handleViewSource}
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

      {/* Guardrails Panel */}
      {guardrailsPanelOpen && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-xl z-50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">AI Guardrails</h2>
            <button
              onClick={() => setGuardrailsPanelOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <GuardrailsPanel
              text={document.content}
              documentId={document.id}
              projectId={document.project_id}
            />
          </div>
        </div>
      )}

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

      {/* Version History Sidebar */}
      {versionPanelOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/20" onClick={() => setVersionPanelOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-96 bg-white dark:bg-gray-900 shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Version History</h2>
              <button
                onClick={() => setVersionPanelOpen(false)}
                className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <VersionHistoryPanel
                key={versionRefreshKey}
                documentId={document.id}
                branchId={currentBranchId}
                onViewSnapshot={(snapshotId) => {
                  console.log('View snapshot:', snapshotId)
                }}
                onRestoreSnapshot={handleRestoreVersion}
                onCompareSnapshots={handleCompareSnapshots}
              />
            </div>
          </div>
        </div>
      )}

      {/* Create Version Modal */}
      {createVersionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCreateVersionOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create Version
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Save a snapshot of the current document state. You can restore this version later.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Version message (optional)
              </label>
              <input
                type="text"
                value={versionMessage}
                onChange={(e) => setVersionMessage(e.target.value)}
                placeholder="e.g., Added introduction section"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateVersion()
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCreateVersionOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateVersion}
                disabled={creatingVersion}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {creatingVersion && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {creatingVersion ? 'Creating...' : 'Create Version'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Branch Modal */}
      {createBranchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCreateBranchOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create Branch
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Create a new branch to work on changes without affecting the main document.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Branch name
              </label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="e.g., draft-introduction"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && branchName.trim()) {
                    handleCreateBranch()
                  }
                }}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCreateBranchOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBranch}
                disabled={creatingBranch || !branchName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {creatingBranch && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {creatingBranch ? 'Creating...' : 'Create Branch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diff Viewer Modal */}
      {diffViewerOpen && compareFromId && compareToId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDiffViewerOpen(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl mx-4 h-[80vh] flex flex-col overflow-hidden">
            <DiffViewer
              documentId={document.id}
              fromSnapshotId={compareFromId}
              toSnapshotId={compareToId}
              onClose={() => setDiffViewerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Merge Request Panel Sidebar */}
      {mergePanelOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/20" onClick={() => setMergePanelOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-96 bg-white dark:bg-gray-900 shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Merge Requests</h2>
              <button
                onClick={() => setMergePanelOpen(false)}
                className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <MergeRequestPanel
                documentId={document.id}
                onMergeRequestSelect={(mrId) => {
                  console.log('Selected merge request:', mrId)
                  // TODO: Open merge request detail view
                }}
                onCreateMergeRequest={() => {
                  if (!currentBranchId) {
                    alert('Please select a branch first')
                    return
                  }
                  setCreateMergeRequestOpen(true)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Create Merge Request Modal */}
      {createMergeRequestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCreateMergeRequestOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create Merge Request
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Request to merge your branch changes into the main document.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={mrTitle}
                  onChange={(e) => setMrTitle(e.target.value)}
                  placeholder="e.g., Add introduction section"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={mrDescription}
                  onChange={(e) => setMrDescription(e.target.value)}
                  placeholder="Describe your changes..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Merging into: <span className="font-medium">main</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setCreateMergeRequestOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMergeRequest}
                disabled={creatingMergeRequest || !mrTitle.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {creatingMergeRequest && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {creatingMergeRequest ? 'Creating...' : 'Create Merge Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Tree Sidebar */}
      {document.project_id && document.workspace_id && (
        <DocumentTreeSidebar
          projectId={document.project_id}
          workspaceId={document.workspace_id}
          currentDocumentId={document.id}
          isOpen={docTreeOpen}
          onClose={() => setDocTreeOpen(false)}
          onCreateDocument={() => {
            // Navigate to create new document
            window.location.href = `/workspace/${document.workspace_id}/project/${document.project_id}/document/new`
          }}
        />
      )}

      {/* Table of Contents Sidebar */}
      <TableOfContents
        content={document.content}
        editorRef={editorRef}
        isOpen={tocOpen}
        onClose={() => setTocOpen(false)}
      />

      {/* PDF Viewer Modal for viewing sources */}
      {pdfViewerSource && (
        <PDFViewerModal
          isOpen={pdfViewerOpen}
          url={pdfViewerSource.url}
          title={pdfViewerSource.title}
          initialPage={pdfViewerSource.page}
          onClose={() => {
            setPdfViewerOpen(false)
            setPdfViewerSource(null)
          }}
        />
      )}
    </div>
  )
}
