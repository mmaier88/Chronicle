import { describe, it, expect } from 'vitest'
import { cn, markdownToHtml, markdownToHtmlParagraphs } from './utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })

  it('merges tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })
})

describe('markdownToHtml', () => {
  it('returns empty string for empty input', () => {
    expect(markdownToHtml('')).toBe('')
  })

  it('escapes HTML entities', () => {
    expect(markdownToHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert("xss")&lt;/script&gt;'
    )
  })

  it('converts bold markdown', () => {
    expect(markdownToHtml('**bold text**')).toBe('<strong>bold text</strong>')
  })

  it('converts italic markdown', () => {
    expect(markdownToHtml('*italic text*')).toBe('<em>italic text</em>')
  })

  it('converts newlines to br tags', () => {
    expect(markdownToHtml('line1\nline2')).toBe('line1<br />line2')
  })

  it('handles combined formatting', () => {
    expect(markdownToHtml('**bold** and *italic*')).toBe(
      '<strong>bold</strong> and <em>italic</em>'
    )
  })
})

describe('markdownToHtmlParagraphs', () => {
  it('returns empty string for empty input', () => {
    expect(markdownToHtmlParagraphs('')).toBe('')
  })

  it('wraps text in paragraph tags', () => {
    expect(markdownToHtmlParagraphs('Hello world')).toBe('<p>Hello world</p>')
  })

  it('creates separate paragraphs for double newlines', () => {
    expect(markdownToHtmlParagraphs('Para 1\n\nPara 2')).toBe(
      '<p>Para 1</p><p>Para 2</p>'
    )
  })

  it('converts single newlines to br within paragraphs', () => {
    expect(markdownToHtmlParagraphs('Line 1\nLine 2')).toBe(
      '<p>Line 1<br>Line 2</p>'
    )
  })

  it('converts bold and italic', () => {
    expect(markdownToHtmlParagraphs('**bold** and *italic*')).toBe(
      '<p><strong>bold</strong> and <em>italic</em></p>'
    )
  })
})
