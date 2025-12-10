'use client'

import { useEffect, useCallback } from 'react'

interface ShortcutHandler {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  handler: () => void
  description?: string
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean
}

export function useKeyboardShortcuts(
  shortcuts: ShortcutHandler[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true } = options

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Don't trigger shortcuts when typing in input fields (except for specific cases)
      const target = event.target as HTMLElement
      const isEditable =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const ctrlMatches = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : true
        const metaMatches = shortcut.meta ? event.metaKey : true
        const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey || shortcut.shift === undefined
        const altMatches = shortcut.alt ? event.altKey : !event.altKey

        // For shortcuts with modifiers, allow them even in editable fields
        const hasModifier = shortcut.ctrl || shortcut.meta || shortcut.alt

        if (keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches) {
          if (isEditable && !hasModifier) continue

          event.preventDefault()
          shortcut.handler()
          break
        }
      }
    },
    [shortcuts, enabled]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// Common shortcut definitions
export const DOCUMENT_SHORTCUTS = {
  SAVE: { key: 's', ctrl: true },
  ASK_PROJECT: { key: 'k', ctrl: true },
  CITATIONS: { key: 'c', ctrl: true, shift: true },
  ARGUMENTS: { key: 'a', ctrl: true, shift: true },
  SAFETY: { key: 'y', ctrl: true, shift: true },
  SEARCH: { key: 'f', ctrl: true },
  BOLD: { key: 'b', ctrl: true },
  ITALIC: { key: 'i', ctrl: true },
  UNDERLINE: { key: 'u', ctrl: true },
}
