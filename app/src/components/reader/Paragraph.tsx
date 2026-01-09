'use client'

import { forwardRef, useEffect, useRef } from 'react'
import type { Paragraph as ParagraphType, TypographySettings } from '@/lib/reader'

interface ParagraphProps {
  paragraph: ParagraphType
  typography: TypographySettings
  isHighlighted?: boolean
  onVisible?: (paragraphId: string, ratio: number) => void
}

/**
 * Paragraph Component
 *
 * The atomic unit of the Chronicle Reader.
 * Renders a single paragraph with typography settings.
 * Reports visibility for scroll tracking.
 */
export const Paragraph = forwardRef<HTMLParagraphElement, ParagraphProps>(
  function Paragraph({ paragraph, typography, isHighlighted, onVisible }, ref) {
    const localRef = useRef<HTMLParagraphElement>(null)
    const combinedRef = (ref || localRef) as React.RefObject<HTMLParagraphElement>

    // Set up IntersectionObserver for visibility tracking
    useEffect(() => {
      if (!onVisible || !combinedRef.current) return

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              onVisible(paragraph.id, entry.intersectionRatio)
            }
          })
        },
        {
          threshold: [0, 0.25, 0.5, 0.75, 1],
          rootMargin: '-10% 0px -10% 0px', // Consider visible when in middle 80%
        }
      )

      observer.observe(combinedRef.current)

      return () => observer.disconnect()
    }, [paragraph.id, onVisible, combinedRef])

    // Apply typography styles
    const style: React.CSSProperties = {
      fontSize: `${typography.font_size}px`,
      lineHeight: typography.line_height,
      fontFamily: typography.font_family === 'serif'
        ? 'var(--font-serif), Georgia, Times New Roman, serif'
        : '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
      marginBottom: `${typography.line_height * 0.75}em`,
      transition: 'background-color 0.3s ease',
      backgroundColor: isHighlighted ? 'rgba(212, 165, 116, 0.15)' : 'transparent',
      borderRadius: isHighlighted ? '4px' : '0',
      padding: isHighlighted ? '0.25em 0.5em' : '0',
      margin: isHighlighted ? '0 -0.5em 1em -0.5em' : undefined,
    }

    return (
      <p
        ref={combinedRef}
        data-paragraph-id={paragraph.id}
        data-section-id={paragraph.section_id}
        style={style}
      >
        {paragraph.text}
      </p>
    )
  }
)

/**
 * Chapter Header Component
 */
interface ChapterHeaderProps {
  title: string
  index: number
  typography: TypographySettings
}

export function ChapterHeader({ title, index, typography }: ChapterHeaderProps) {
  const style: React.CSSProperties = {
    fontSize: `${typography.font_size * 1.5}px`,
    fontFamily: typography.font_family === 'serif'
      ? 'var(--font-serif), Georgia, Times New Roman, serif'
      : '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
    fontWeight: 600,
    marginTop: index === 0 ? '0' : '3em',
    marginBottom: '1.5em',
    textAlign: 'center',
    opacity: 0.9,
  }

  return (
    <h2 style={style} data-chapter-index={index}>
      {title}
    </h2>
  )
}

/**
 * Chapter Divider Component
 */
export function ChapterDivider() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '3em 0',
      opacity: 0.3,
    }}>
      <div style={{ width: '2em', height: '1px', backgroundColor: 'currentColor' }} />
      <div style={{ margin: '0 1em', fontSize: '1.5em' }}>*</div>
      <div style={{ width: '2em', height: '1px', backgroundColor: 'currentColor' }} />
    </div>
  )
}
