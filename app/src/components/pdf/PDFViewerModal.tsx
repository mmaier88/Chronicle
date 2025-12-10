'use client'

import { useEffect } from 'react'
import { PDFViewer } from './PDFViewer'

interface PDFViewerModalProps {
  isOpen: boolean
  url: string
  title?: string
  initialPage?: number
  onClose: () => void
  onTextSelect?: (text: string, page: number) => void
}

export function PDFViewerModal({
  isOpen,
  url,
  title,
  initialPage,
  onClose,
  onTextSelect
}: PDFViewerModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-[90vw] h-[90vh] max-w-6xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden">
        <PDFViewer
          url={url}
          title={title}
          initialPage={initialPage}
          onClose={onClose}
          onTextSelect={onTextSelect}
        />
      </div>
    </div>
  )
}
