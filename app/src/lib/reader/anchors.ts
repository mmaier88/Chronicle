/**
 * Text-Quote Anchors
 *
 * Reliable position tracking that survives font/layout changes.
 * Based on the W3C Text Fragments specification concept.
 *
 * Instead of relying on scroll position (fragile), we capture
 * the actual text content around the reading position and use
 * that to restore the position when returning to the book.
 */

/**
 * A text-based position anchor
 */
export interface TextAnchor {
  /** Chapter this anchor is in */
  chapterId: string
  /** Approximate character offset (fallback) */
  charOffsetApprox: number
  /** ~20 chars before the position */
  prefix: string
  /** Up to 120 chars from the position (what's visible) */
  exact: string
  /** ~20 chars after the exact text */
  suffix: string
}

/**
 * Result of resolving an anchor
 */
export interface AnchorResolution {
  /** Character offset in the chapter text */
  charOffset: number
  /** Confidence level of the match */
  confidence: 'exact' | 'fuzzy' | 'fallback'
}

// Configuration
const PREFIX_LENGTH = 20
const EXACT_LENGTH = 120
const SUFFIX_LENGTH = 20

/**
 * Create a text anchor from a position in the text.
 *
 * @param chapterId - The chapter ID
 * @param charOffset - Character offset in the chapter text
 * @param fullText - The full chapter text content
 */
export function createAnchor(
  chapterId: string,
  charOffset: number,
  fullText: string
): TextAnchor {
  // Clamp offset to valid range
  const safeOffset = Math.max(0, Math.min(charOffset, fullText.length - 1))

  // Extract prefix (text before position)
  const prefixStart = Math.max(0, safeOffset - PREFIX_LENGTH)
  const prefix = fullText.slice(prefixStart, safeOffset)

  // Extract exact (text from position, what's visible)
  const exactEnd = Math.min(fullText.length, safeOffset + EXACT_LENGTH)
  const exact = fullText.slice(safeOffset, exactEnd)

  // Extract suffix (text after exact)
  const suffixEnd = Math.min(fullText.length, exactEnd + SUFFIX_LENGTH)
  const suffix = fullText.slice(exactEnd, suffixEnd)

  return {
    chapterId,
    charOffsetApprox: safeOffset,
    prefix,
    exact,
    suffix,
  }
}

/**
 * Resolve a text anchor to a character offset.
 * Uses multiple strategies for robustness.
 *
 * @param anchor - The anchor to resolve
 * @param fullText - The current chapter text content
 * @returns Resolution result with offset and confidence
 */
export function resolveAnchor(
  anchor: TextAnchor,
  fullText: string
): AnchorResolution {
  // Strategy 1: Exact match of the exact text
  const exactIndex = fullText.indexOf(anchor.exact)
  if (exactIndex !== -1) {
    // Found! But check if there are multiple matches
    const secondMatch = fullText.indexOf(anchor.exact, exactIndex + 1)
    if (secondMatch === -1) {
      // Unique match - high confidence
      return { charOffset: exactIndex, confidence: 'exact' }
    }
    // Multiple matches - use prefix to disambiguate
  }

  // Strategy 2: Search for prefix + exact combination
  if (anchor.prefix.length > 0) {
    const combined = anchor.prefix + anchor.exact
    const combinedIndex = fullText.indexOf(combined)
    if (combinedIndex !== -1) {
      // Found with prefix context - adjust to start after prefix
      return {
        charOffset: combinedIndex + anchor.prefix.length,
        confidence: 'exact',
      }
    }
  }

  // Strategy 3: Search for exact + suffix combination
  if (anchor.suffix.length > 0) {
    const combined = anchor.exact + anchor.suffix
    const combinedIndex = fullText.indexOf(combined)
    if (combinedIndex !== -1) {
      return { charOffset: combinedIndex, confidence: 'exact' }
    }
  }

  // Strategy 4: If exact match exists (even if ambiguous),
  // find the one closest to the approximate offset
  if (exactIndex !== -1) {
    let bestMatch = exactIndex
    let bestDistance = Math.abs(exactIndex - anchor.charOffsetApprox)

    let searchPos = exactIndex + 1
    while (searchPos < fullText.length) {
      const nextMatch = fullText.indexOf(anchor.exact, searchPos)
      if (nextMatch === -1) break

      const distance = Math.abs(nextMatch - anchor.charOffsetApprox)
      if (distance < bestDistance) {
        bestDistance = distance
        bestMatch = nextMatch
      }
      searchPos = nextMatch + 1
    }

    return { charOffset: bestMatch, confidence: 'fuzzy' }
  }

  // Strategy 5: Fuzzy match - look for partial match near the approximate offset
  const fuzzyResult = fuzzyMatch(anchor.exact, fullText, anchor.charOffsetApprox)
  if (fuzzyResult !== null) {
    return { charOffset: fuzzyResult, confidence: 'fuzzy' }
  }

  // Strategy 6: Fallback to approximate offset (clamped to valid range)
  return {
    charOffset: Math.min(anchor.charOffsetApprox, Math.max(0, fullText.length - 1)),
    confidence: 'fallback',
  }
}

/**
 * Fuzzy match helper - finds partial matches near a position.
 * Useful when text has been slightly edited.
 */
function fuzzyMatch(
  needle: string,
  haystack: string,
  nearPosition: number
): number | null {
  // Use first 40 chars of needle for fuzzy matching
  const shortNeedle = needle.slice(0, 40)
  if (shortNeedle.length < 10) return null

  // Search in a window around the approximate position
  const windowSize = 2000
  const windowStart = Math.max(0, nearPosition - windowSize)
  const windowEnd = Math.min(haystack.length, nearPosition + windowSize)
  const window = haystack.slice(windowStart, windowEnd)

  // Try to find the short needle in the window
  const windowIndex = window.indexOf(shortNeedle)
  if (windowIndex !== -1) {
    return windowStart + windowIndex
  }

  // Try word-by-word matching
  const words = shortNeedle.split(/\s+/).filter(w => w.length >= 4)
  if (words.length >= 3) {
    // Look for a sequence of 3 words
    for (let i = 0; i <= words.length - 3; i++) {
      const threeWords = words.slice(i, i + 3).join(' ')
      const wordIndex = window.indexOf(threeWords)
      if (wordIndex !== -1) {
        return windowStart + wordIndex
      }
    }
  }

  return null
}

/**
 * Get the character offset for a given scroll position in the rendered content.
 * This is used to create an anchor when the user scrolls.
 *
 * @param scrollTop - Current scroll position
 * @param contentElement - The DOM element containing the rendered content
 * @returns Character offset at the top of the viewport
 */
export function getCharOffsetFromScroll(
  scrollTop: number,
  contentElement: HTMLElement
): number {
  // Get all text nodes in the content
  const walker = document.createTreeWalker(
    contentElement,
    NodeFilter.SHOW_TEXT,
    null
  )

  let totalChars = 0
  let node: Text | null

  while ((node = walker.nextNode() as Text | null)) {
    const parent = node.parentElement
    if (!parent) continue

    const rect = getTextNodeRect(node)
    if (!rect) continue

    // Check if this text node is at or past the scroll position
    if (rect.bottom > scrollTop) {
      // This node is visible - calculate offset within it
      const nodeTop = rect.top
      const nodeHeight = rect.height

      if (nodeHeight > 0 && scrollTop > nodeTop) {
        // Scroll is partway through this node
        const ratio = (scrollTop - nodeTop) / nodeHeight
        const charOffset = Math.floor(ratio * node.textContent!.length)
        return totalChars + charOffset
      }

      // Scroll is at or before the start of this node
      return totalChars
    }

    totalChars += node.textContent?.length || 0
  }

  return totalChars
}

/**
 * Get a bounding rect for a text node
 */
function getTextNodeRect(node: Text): DOMRect | null {
  const range = document.createRange()
  range.selectNodeContents(node)
  const rects = range.getClientRects()
  if (rects.length === 0) return null

  // Return a combined rect
  let top = Infinity
  let bottom = -Infinity
  let left = Infinity
  let right = -Infinity

  for (const rect of rects) {
    top = Math.min(top, rect.top)
    bottom = Math.max(bottom, rect.bottom)
    left = Math.min(left, rect.left)
    right = Math.max(right, rect.right)
  }

  return new DOMRect(left, top, right - left, bottom - top)
}

/**
 * Get the scroll position for a given character offset.
 * This is used to restore position from an anchor.
 *
 * @param charOffset - Character offset to find
 * @param contentElement - The DOM element containing the rendered content
 * @returns Scroll position (scrollTop) to show that character
 */
export function getScrollFromCharOffset(
  charOffset: number,
  contentElement: HTMLElement
): number {
  const walker = document.createTreeWalker(
    contentElement,
    NodeFilter.SHOW_TEXT,
    null
  )

  let totalChars = 0
  let node: Text | null

  while ((node = walker.nextNode() as Text | null)) {
    const nodeLength = node.textContent?.length || 0

    if (totalChars + nodeLength > charOffset) {
      // The target offset is in this node
      const offsetInNode = charOffset - totalChars

      // Get position of this character
      const range = document.createRange()
      range.setStart(node, Math.min(offsetInNode, nodeLength))
      range.setEnd(node, Math.min(offsetInNode + 1, nodeLength))

      const rect = range.getBoundingClientRect()
      const contentRect = contentElement.getBoundingClientRect()

      // Return the scroll position relative to the content element
      return rect.top - contentRect.top + contentElement.scrollTop
    }

    totalChars += nodeLength
  }

  // Offset beyond content - return end
  return contentElement.scrollHeight
}

/**
 * Extract plain text from HTML/markdown content.
 * Used to create anchors from rendered content.
 */
export function extractPlainText(content: string): string {
  // Simple HTML tag removal (for basic use)
  // In production, this would use the DOM or a proper parser
  return content
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
