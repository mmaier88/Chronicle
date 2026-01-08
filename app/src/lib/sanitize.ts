/**
 * HTML Sanitization Utilities
 *
 * Uses DOMPurify to safely sanitize HTML content.
 * This is important for any user-generated or AI-generated content
 * that will be rendered with dangerouslySetInnerHTML.
 */

import DOMPurify from 'dompurify'

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined'

/**
 * Sanitize HTML content to prevent XSS attacks
 * Safe to use with dangerouslySetInnerHTML
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return ''

  // Server-side: Return escaped HTML (safe fallback)
  if (!isBrowser) {
    return dirty
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  // Client-side: Use DOMPurify
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'b', 'i', 'u',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'a', 'span', 'div',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    // Force links to open in new tab safely
    ADD_ATTR: ['target', 'rel'],
  })
}

/**
 * Sanitize and convert markdown to HTML
 * Combines markdownToHtml with sanitization
 */
export function sanitizeMarkdown(markdown: string): string {
  if (!markdown) return ''

  // First convert markdown to HTML
  let html = markdown
    // Convert **bold** to <strong>
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Convert *italic* to <em>
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Convert paragraphs (double newlines)
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('')

  // Then sanitize
  return sanitizeHtml(html)
}

/**
 * Strip all HTML tags, returning plain text
 */
export function stripHtml(html: string): string {
  if (!html) return ''

  if (!isBrowser) {
    // Server-side: basic regex stripping
    return html.replace(/<[^>]*>/g, '')
  }

  // Client-side: Use DOMPurify
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] })
}
