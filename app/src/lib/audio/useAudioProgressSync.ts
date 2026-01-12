'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useAudioStore } from './store'

// Debounce helper
function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): T & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const debouncedFn = (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }

  debouncedFn.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId)
  }

  return debouncedFn as T & { cancel: () => void }
}

export function useAudioProgressSync() {
  const {
    bookId,
    sections,
    currentSectionIndex,
    progress,
    playbackRate,
    isPlaying,
  } = useAudioStore()

  const lastSavedRef = useRef<{
    sectionId: string
    offsetMs: number
  } | null>(null)

  const saveProgress = useCallback(async () => {
    if (!bookId || sections.length === 0) return

    const currentSection = sections[currentSectionIndex]
    if (!currentSection) return

    const offsetMs = Math.floor(progress * 1000)
    const sectionId = currentSection.id

    // Skip if same as last saved (within 1 second)
    if (
      lastSavedRef.current &&
      lastSavedRef.current.sectionId === sectionId &&
      Math.abs(lastSavedRef.current.offsetMs - offsetMs) < 1000
    ) {
      return
    }

    try {
      await fetch('/api/reader/audio-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          paragraphId: `section:${sectionId}:${offsetMs}`,
          audioOffsetMs: offsetMs,
          playbackSpeed: playbackRate,
        }),
      })

      lastSavedRef.current = { sectionId, offsetMs }
    } catch (err) {
      console.error('Failed to save audio progress:', err)
    }
  }, [bookId, sections, currentSectionIndex, progress, playbackRate])

  // Create debounced save function
  const debouncedSave = useRef(debounce(saveProgress, 5000))

  // Update debounced function when saveProgress changes
  useEffect(() => {
    debouncedSave.current = debounce(saveProgress, 5000)
  }, [saveProgress])

  // Save progress during playback
  useEffect(() => {
    if (isPlaying && bookId) {
      debouncedSave.current()
    }
  }, [isPlaying, bookId, progress])

  // Save immediately when pausing or closing
  useEffect(() => {
    if (!isPlaying && bookId && progress > 0) {
      // Cancel pending debounced save and save immediately
      debouncedSave.current.cancel()
      saveProgress()
    }
  }, [isPlaying, bookId, progress, saveProgress])

  // Save on section change
  useEffect(() => {
    if (bookId && currentSectionIndex > 0) {
      saveProgress()
    }
  }, [currentSectionIndex, bookId, saveProgress])

  // Save on unmount
  useEffect(() => {
    return () => {
      if (bookId) {
        saveProgress()
      }
    }
  }, [bookId, saveProgress])
}
