'use client'

import { useState, useEffect, useCallback } from 'react'
import { List, ChevronRight, Hash } from 'lucide-react'

interface HeadingItem {
  id: string
  text: string
  level: number
  element?: HTMLElement
}

interface TableOfContentsProps {
  content: string
  editorRef?: React.RefObject<HTMLDivElement | null>
  isOpen: boolean
  onClose: () => void
}

export function TableOfContents({
  content,
  editorRef,
  isOpen,
  onClose,
}: TableOfContentsProps) {
  const [headings, setHeadings] = useState<HeadingItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  // Extract headings from content
  useEffect(() => {
    // Parse HTML content for headings
    const parser = new DOMParser()
    const doc = parser.parseFromString(content, 'text/html')
    const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6')

    const extractedHeadings: HeadingItem[] = []
    headingElements.forEach((el, index) => {
      const text = el.textContent?.trim() || ''
      if (text) {
        const level = parseInt(el.tagName[1])
        const id = `heading-${index}`
        extractedHeadings.push({ id, text, level })
      }
    })

    setHeadings(extractedHeadings)
  }, [content])

  // Track scroll position to highlight active heading
  useEffect(() => {
    if (!editorRef?.current || headings.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-toc-id')
            if (id) setActiveId(id)
          }
        })
      },
      { rootMargin: '-20% 0px -80% 0px' }
    )

    // Observe headings in the editor
    const editorHeadings = editorRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6')
    editorHeadings.forEach((el, index) => {
      el.setAttribute('data-toc-id', `heading-${index}`)
      observer.observe(el)
    })

    return () => observer.disconnect()
  }, [editorRef, headings])

  const scrollToHeading = useCallback((index: number) => {
    if (!editorRef?.current) return

    const editorHeadings = editorRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6')
    const targetHeading = editorHeadings[index]

    if (targetHeading) {
      targetHeading.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveId(`heading-${index}`)
    }
  }, [editorRef])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-40 lg:relative lg:inset-auto">
      {/* Backdrop for mobile */}
      <div
        className="absolute inset-0 bg-black/20 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside className="absolute right-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col lg:relative">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <List className="w-4 h-4" />
            Contents
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded lg:hidden"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Headings List */}
        <nav className="flex-1 overflow-y-auto py-2">
          {headings.length === 0 ? (
            <div className="text-center py-8 px-4">
              <Hash className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No headings found
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Add headings to create a table of contents
              </p>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {headings.map((heading, index) => (
                <li key={heading.id}>
                  <button
                    onClick={() => scrollToHeading(index)}
                    className={`w-full text-left px-3 py-1.5 text-sm transition-colors flex items-center gap-1.5 ${
                      activeId === heading.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    style={{ paddingLeft: `${(heading.level - 1) * 12 + 12}px` }}
                  >
                    {heading.level > 1 && (
                      <ChevronRight className="w-3 h-3 flex-shrink-0 text-gray-400" />
                    )}
                    <span className="truncate">{heading.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>

        {/* Stats */}
        {headings.length > 0 && (
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {headings.length} section{headings.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </aside>
    </div>
  )
}
