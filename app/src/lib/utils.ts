import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert basic markdown formatting to HTML.
 * Handles **bold**, *italic*, and line breaks.
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
