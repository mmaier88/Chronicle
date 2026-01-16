'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Chapter, Section } from '@/types/chronicle'
import { Loader2, Save, ChevronDown, ChevronRight } from 'lucide-react'

interface OutlineEditorProps {
  bookId: string
}

interface ChapterWithSections extends Chapter {
  sections: Section[]
}

interface PendingChanges {
  chapters: Record<string, Partial<Chapter>>
  sections: Record<string, Partial<Section>>
}

export function OutlineEditor({ bookId }: OutlineEditorProps) {
  const router = useRouter()
  const [chapters, setChapters] = useState<ChapterWithSections[]>([])
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>({ chapters: {}, sections: {} })

  const hasChanges = Object.keys(pendingChanges.chapters).length > 0 || Object.keys(pendingChanges.sections).length > 0

  useEffect(() => {
    async function loadOutline() {
      const supabase = createClient()

      // Fetch chapters
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('chapters')
        .select('*')
        .eq('book_id', bookId)
        .order('index', { ascending: true })

      if (chaptersError) {
        setError('Failed to load chapters')
        setIsLoading(false)
        return
      }

      const typedChapters = (chaptersData || []) as Chapter[]

      // Fetch sections for all chapters
      const chapterIds = typedChapters.map(c => c.id)
      let sectionsData: Section[] = []

      if (chapterIds.length > 0) {
        const { data, error: sectionsError } = await supabase
          .from('sections')
          .select('*')
          .in('chapter_id', chapterIds)
          .order('index', { ascending: true })

        if (sectionsError) {
          setError('Failed to load sections')
          setIsLoading(false)
          return
        }

        sectionsData = (data || []) as Section[]
      }

      // Group sections by chapter
      const sectionsByChapter: Record<string, Section[]> = {}
      for (const section of sectionsData) {
        if (!sectionsByChapter[section.chapter_id]) {
          sectionsByChapter[section.chapter_id] = []
        }
        sectionsByChapter[section.chapter_id].push(section)
      }

      // Combine chapters with their sections
      const chaptersWithSections: ChapterWithSections[] = typedChapters.map(chapter => ({
        ...chapter,
        sections: sectionsByChapter[chapter.id] || []
      }))

      setChapters(chaptersWithSections)
      setIsLoading(false)
    }

    loadOutline()
  }, [bookId])

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev)
      if (next.has(chapterId)) {
        next.delete(chapterId)
      } else {
        next.add(chapterId)
      }
      return next
    })
  }

  const updateChapter = (chapterId: string, field: keyof Chapter, value: string) => {
    // Update local state
    setChapters(prev => prev.map(chapter => {
      if (chapter.id === chapterId) {
        return { ...chapter, [field]: value }
      }
      return chapter
    }))

    // Track pending changes
    setPendingChanges(prev => ({
      ...prev,
      chapters: {
        ...prev.chapters,
        [chapterId]: {
          ...prev.chapters[chapterId],
          [field]: value
        }
      }
    }))

    setSaveSuccess(false)
  }

  const updateSection = (sectionId: string, chapterId: string, field: keyof Section, value: string) => {
    // Update local state
    setChapters(prev => prev.map(chapter => {
      if (chapter.id === chapterId) {
        return {
          ...chapter,
          sections: chapter.sections.map(section => {
            if (section.id === sectionId) {
              return { ...section, [field]: value }
            }
            return section
          })
        }
      }
      return chapter
    }))

    // Track pending changes
    setPendingChanges(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionId]: {
          ...prev.sections[sectionId],
          [field]: value
        }
      }
    }))

    setSaveSuccess(false)
  }

  const handleSave = async () => {
    if (!hasChanges) return

    setIsSaving(true)
    setError(null)
    setSaveSuccess(false)

    try {
      // Convert pending changes to API format
      const chaptersToUpdate = Object.entries(pendingChanges.chapters).map(([id, changes]) => ({
        id,
        ...changes
      }))

      const sectionsToUpdate = Object.entries(pendingChanges.sections).map(([id, changes]) => ({
        id,
        ...changes
      }))

      const response = await fetch(`/api/books/${bookId}/outline`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapters: chaptersToUpdate,
          sections: sectionsToUpdate
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || data.message || 'Failed to save changes')
      }

      setPendingChanges({ chapters: {}, sections: {} })
      setSaveSuccess(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="app-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
        <Loader2 style={{ width: 24, height: 24, animation: 'spin 1s linear infinite', color: 'var(--amber-warm)' }} />
      </div>
    )
  }

  if (chapters.length === 0) {
    return (
      <div className="app-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <p className="app-body">No chapters to edit yet</p>
        <p className="app-body-sm" style={{ marginTop: '0.5rem', opacity: 0.7 }}>
          Lock the constitution and create chapters to see them here
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Error banner */}
      {error && (
        <div style={{
          marginBottom: '1rem',
          padding: '1rem',
          background: 'rgba(244, 63, 94, 0.1)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: 12,
          color: '#fda4af',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}

      {/* Success banner */}
      {saveSuccess && (
        <div style={{
          marginBottom: '1rem',
          padding: '1rem',
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: 12,
          color: '#86efac',
          fontSize: '0.875rem'
        }}>
          Changes saved successfully
        </div>
      )}

      {/* Chapters list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {chapters.map((chapter, chapterIdx) => {
          const isExpanded = expandedChapters.has(chapter.id)

          return (
            <div key={chapter.id} className="app-card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Chapter header */}
              <div style={{ padding: '1.25rem', borderBottom: isExpanded ? '1px solid rgba(250, 246, 237, 0.06)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <span className="app-body-sm" style={{ opacity: 0.5, paddingTop: '0.25rem', flexShrink: 0 }}>
                    Chapter {chapterIdx + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      value={chapter.title}
                      onChange={(e) => updateChapter(chapter.id, 'title', e.target.value)}
                      disabled={isSaving}
                      className="app-input"
                      style={{
                        fontWeight: 600,
                        fontSize: '1.125rem',
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        width: '100%',
                      }}
                      placeholder="Chapter title..."
                    />
                  </div>
                </div>

                {/* Chapter metadata */}
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label className="app-label" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem' }}>
                      Purpose
                    </label>
                    <textarea
                      value={chapter.purpose || ''}
                      onChange={(e) => updateChapter(chapter.id, 'purpose', e.target.value)}
                      disabled={isSaving}
                      rows={2}
                      className="app-textarea"
                      style={{ background: 'rgba(26, 39, 68, 0.3)', resize: 'none', width: '100%' }}
                      placeholder="What this chapter accomplishes..."
                    />
                  </div>

                  <div>
                    <label className="app-label" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem' }}>
                      Central Claim
                    </label>
                    <textarea
                      value={chapter.central_claim || ''}
                      onChange={(e) => updateChapter(chapter.id, 'central_claim', e.target.value)}
                      disabled={isSaving}
                      rows={2}
                      className="app-textarea"
                      style={{ background: 'rgba(26, 39, 68, 0.3)', resize: 'none', width: '100%' }}
                      placeholder="The main argument or insight..."
                    />
                  </div>
                </div>

                {/* Sections toggle */}
                {chapter.sections.length > 0 && (
                  <button
                    onClick={() => toggleChapter(chapter.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginTop: '1rem',
                      padding: '0.5rem 0',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--amber-warm)',
                      fontSize: '0.875rem',
                    }}
                  >
                    {isExpanded ? (
                      <ChevronDown style={{ width: 16, height: 16 }} />
                    ) : (
                      <ChevronRight style={{ width: 16, height: 16 }} />
                    )}
                    {chapter.sections.length} section{chapter.sections.length !== 1 ? 's' : ''}
                  </button>
                )}
              </div>

              {/* Sections (collapsible) */}
              {isExpanded && chapter.sections.length > 0 && (
                <div style={{ background: 'rgba(26, 39, 68, 0.2)' }}>
                  {chapter.sections.map((section, sectionIdx) => (
                    <div
                      key={section.id}
                      style={{
                        padding: '1.25rem',
                        paddingLeft: '2.5rem',
                        borderBottom: sectionIdx < chapter.sections.length - 1 ? '1px solid rgba(250, 246, 237, 0.04)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                        <span className="app-body-sm" style={{ opacity: 0.5, paddingTop: '0.25rem', flexShrink: 0 }}>
                          {chapterIdx + 1}.{sectionIdx + 1}
                        </span>
                        <div style={{ flex: 1 }}>
                          <input
                            type="text"
                            value={section.title}
                            onChange={(e) => updateSection(section.id, chapter.id, 'title', e.target.value)}
                            disabled={isSaving}
                            className="app-input"
                            style={{
                              fontWeight: 500,
                              background: 'transparent',
                              border: 'none',
                              padding: 0,
                              width: '100%',
                            }}
                            placeholder="Section title..."
                          />
                        </div>
                      </div>

                      <div style={{ marginTop: '0.75rem', marginLeft: '2.5rem' }}>
                        <label className="app-label" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem' }}>
                          Goal
                        </label>
                        <textarea
                          value={section.goal || ''}
                          onChange={(e) => updateSection(section.id, chapter.id, 'goal', e.target.value)}
                          disabled={isSaving}
                          rows={2}
                          className="app-textarea"
                          style={{ background: 'rgba(26, 39, 68, 0.3)', resize: 'none', width: '100%' }}
                          placeholder="What this section accomplishes..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Save button */}
      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="app-button-primary"
          style={{
            opacity: isSaving || !hasChanges ? 0.5 : 1,
            cursor: isSaving || !hasChanges ? 'not-allowed' : 'pointer',
          }}
        >
          {isSaving ? (
            <>
              <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
              Saving...
            </>
          ) : (
            <>
              <Save style={{ width: 16, height: 16 }} />
              Save Changes
            </>
          )}
        </button>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
