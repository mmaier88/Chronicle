'use client'

import { useState, useRef, useEffect } from 'react'
import { Download, FileText, BookOpen, Loader2, ChevronDown } from 'lucide-react'
import { generatePDF } from '@/lib/export/pdf'
import { generateEPUB } from '@/lib/export/epub'

interface Chapter {
  title: string
  sections: {
    title: string
    content_text: string | null
  }[]
}

interface ExportButtonProps {
  book: {
    title: string
    cover_url?: string | null
  }
  chapters: Chapter[]
}

export function ExportButton({ book, chapters }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [exportFormat, setExportFormat] = useState<'pdf' | 'epub' | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleExport = async (format: 'pdf' | 'epub') => {
    setIsExporting(true)
    setExportFormat(format)
    setShowMenu(false)

    try {
      const options = {
        title: book.title,
        coverUrl: book.cover_url,
        chapters: chapters.map((ch) => ({
          title: ch.title,
          sections: ch.sections.map((s) => ({
            title: s.title,
            content: s.content_text || '',
          })),
        })),
      }

      let blob: Blob
      let filename: string
      let mimeType: string

      if (format === 'pdf') {
        blob = await generatePDF(options)
        filename = `${sanitizeFilename(book.title)}.pdf`
        mimeType = 'application/pdf'
      } else {
        blob = await generateEPUB(options)
        filename = `${sanitizeFilename(book.title)}.epub`
        mimeType = 'application/epub+zip'
      }

      // Trigger download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.type = mimeType
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setIsExporting(false)
      setExportFormat(null)
    }
  }

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          background: 'rgba(250, 246, 237, 0.05)',
          border: '1px solid rgba(250, 246, 237, 0.15)',
          borderRadius: 8,
          color: 'var(--moon-soft)',
          fontSize: '0.875rem',
          cursor: isExporting ? 'wait' : 'pointer',
          transition: 'all 0.2s',
          opacity: isExporting ? 0.7 : 1,
        }}
      >
        {isExporting ? (
          <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
        ) : (
          <Download style={{ width: 16, height: 16 }} />
        )}
        {isExporting ? `Exporting ${exportFormat?.toUpperCase()}...` : 'Export'}
        <ChevronDown style={{ width: 14, height: 14, opacity: 0.6 }} />
      </button>

      {showMenu && !isExporting && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            background: 'rgba(20, 30, 48, 0.98)',
            border: '1px solid rgba(250, 246, 237, 0.15)',
            borderRadius: 8,
            padding: '0.25rem',
            minWidth: 140,
            zIndex: 50,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
        >
          <button
            onClick={() => handleExport('pdf')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.75rem 1rem',
              background: 'transparent',
              border: 'none',
              borderRadius: 6,
              color: 'var(--moon-light)',
              fontSize: '0.875rem',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <FileText style={{ width: 18, height: 18, color: 'var(--amber-warm)' }} />
            <div>
              <div style={{ fontWeight: 500 }}>PDF</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--moon-soft)', opacity: 0.7 }}>
                For printing
              </div>
            </div>
          </button>
          <button
            onClick={() => handleExport('epub')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.75rem 1rem',
              background: 'transparent',
              border: 'none',
              borderRadius: 6,
              color: 'var(--moon-light)',
              fontSize: '0.875rem',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <BookOpen style={{ width: 18, height: 18, color: 'var(--amber-warm)' }} />
            <div>
              <div style={{ fontWeight: 500 }}>EPUB</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--moon-soft)', opacity: 0.7 }}>
                For e-readers
              </div>
            </div>
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        button:hover {
          background: rgba(250, 246, 237, 0.1) !important;
        }
      `}</style>
    </div>
  )
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-z0-9\s-]/gi, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 100)
}
