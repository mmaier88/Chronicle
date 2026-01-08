import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert basic markdown formatting to HTML.
 * Handles **bold**, *italic*, and line breaks.
 * Escapes HTML entities for safe display.
 */
export function markdownToHtml(text: string): string {
  if (!text) return ''

  // Escape HTML entities first
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Convert **bold** to <strong>
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

  // Convert *italic* to <em>
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')

  // Convert line breaks to <br> for display
  html = html.replace(/\n/g, '<br />')

  return html
}

/**
 * Convert markdown to HTML with paragraph structure.
 * For use with TipTap and other rich text editors.
 * Does NOT escape HTML (assumes trusted content like AI-generated text).
 */
export function markdownToHtmlParagraphs(markdown: string): string {
  if (!markdown) return ''

  return markdown
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
}
