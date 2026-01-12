'use client'

import { create } from 'zustand'
import type {
  AudioSection,
  AudioChapter,
  AudioCache,
  SavedAudioProgress,
  SleepTimerState,
  PlaybackSpeed
} from './types'
import { PLAYBACK_SPEEDS } from './types'

interface AudioState {
  // Book & Content
  bookId: string | null
  bookTitle: string
  coverUrl: string | null
  sections: AudioSection[]
  chapters: AudioChapter[]

  // Playback state
  currentSectionIndex: number
  isPlaying: boolean
  isLoading: boolean
  progress: number // seconds into current section
  duration: number // duration of current section
  playbackRate: PlaybackSpeed

  // Player UI state
  isExpanded: boolean // mini vs full-screen
  isVisible: boolean // whether player is active at all

  // Sleep timer
  sleepTimer: SleepTimerState

  // Audio cache
  audioCache: AudioCache

  // Audio element reference (set by AudioProvider)
  audioRef: HTMLAudioElement | null

  // TTS endpoint function
  getAudioEndpoint: ((sectionId: string) => string) | null
}

interface AudioActions {
  // Setup
  setAudioRef: (ref: HTMLAudioElement | null) => void

  // Book loading
  loadBook: (
    bookId: string,
    title: string,
    coverUrl: string | null,
    sections: AudioSection[],
    getAudioEndpoint: (sectionId: string) => string,
    savedProgress?: SavedAudioProgress
  ) => void

  // Playback controls
  play: () => Promise<void>
  pause: () => void
  togglePlayPause: () => Promise<void>
  seekTo: (seconds: number) => void
  skipForward: (seconds?: number) => void
  skipBackward: (seconds?: number) => void

  // Navigation
  nextSection: () => Promise<void>
  previousSection: () => Promise<void>
  goToSection: (index: number) => Promise<void>
  goToChapter: (chapterIndex: number) => Promise<void>

  // Settings
  setPlaybackRate: (rate: PlaybackSpeed) => void
  cyclePlaybackRate: () => void

  // UI state
  setExpanded: (expanded: boolean) => void
  toggleExpanded: () => void

  // Sleep timer
  setSleepTimer: (minutes: number | 'end-of-chapter' | null) => void
  checkSleepTimer: () => void

  // Cleanup
  close: () => void

  // Internal
  updateProgress: (seconds: number) => void
  updateDuration: (seconds: number) => void
  handleSectionEnded: () => void
  fetchAudio: (sectionId: string) => Promise<{ url: string; duration: number } | null>
  prefetchNext: (fromIndex: number) => void
}

type AudioStore = AudioState & AudioActions

// Helper to derive chapters from sections
function deriveChapters(sections: AudioSection[]): AudioChapter[] {
  const chapters: AudioChapter[] = []
  let currentChapterIndex = -1

  sections.forEach((section, index) => {
    if (section.chapterIndex !== currentChapterIndex) {
      currentChapterIndex = section.chapterIndex
      chapters.push({
        index: section.chapterIndex,
        title: section.chapterTitle,
        sectionStartIndex: index,
        sectionCount: 1,
        estimatedDuration: 0, // Will be updated when audio loads
      })
    } else {
      chapters[chapters.length - 1].sectionCount++
    }
  })

  return chapters
}

export const useAudioStore = create<AudioStore>((set, get) => ({
  // Initial state
  bookId: null,
  bookTitle: '',
  coverUrl: null,
  sections: [],
  chapters: [],
  currentSectionIndex: 0,
  isPlaying: false,
  isLoading: false,
  progress: 0,
  duration: 0,
  playbackRate: 1,
  isExpanded: false,
  isVisible: false,
  sleepTimer: { mode: 'off', endTime: null, durationMinutes: null },
  audioCache: {},
  audioRef: null,
  getAudioEndpoint: null,

  // Setup
  setAudioRef: (ref) => set({ audioRef: ref }),

  // Load a book into the player
  loadBook: (bookId, title, coverUrl, sections, getAudioEndpoint, savedProgress) => {
    const chapters = deriveChapters(sections)

    // Find starting position from saved progress
    let startIndex = 0
    let startOffset = 0

    if (savedProgress) {
      const savedIndex = sections.findIndex(s => s.id === savedProgress.sectionId)
      if (savedIndex >= 0) {
        startIndex = savedIndex
        startOffset = savedProgress.offsetMs / 1000
      }
    }

    set({
      bookId,
      bookTitle: title,
      coverUrl,
      sections,
      chapters,
      currentSectionIndex: startIndex,
      progress: startOffset,
      playbackRate: savedProgress?.playbackSpeed as PlaybackSpeed || 1,
      isVisible: true,
      isExpanded: true, // Open full-screen when loading
      audioCache: {},
      getAudioEndpoint,
    })
  },

  // Fetch audio for a section
  // Now supports streaming: first checks metadata, then streams or uses cached URL
  fetchAudio: async (sectionId) => {
    const { audioCache, getAudioEndpoint } = get()

    console.log('[Audio] fetchAudio called for:', sectionId)

    if (!getAudioEndpoint) {
      console.error('[Audio] No getAudioEndpoint function set')
      return null
    }

    // Check local cache
    if (audioCache[sectionId]?.status === 'ready') {
      console.log('[Audio] Using local cache for:', sectionId)
      return { url: audioCache[sectionId].url, duration: audioCache[sectionId].duration }
    }

    // Mark as loading
    set(state => ({
      audioCache: {
        ...state.audioCache,
        [sectionId]: { url: '', duration: 0, status: 'loading' }
      }
    }))

    try {
      // First, check if audio is cached on server (metadata request)
      const metadataUrl = `${getAudioEndpoint(sectionId)}?metadata=true`
      console.log('[Audio] Fetching metadata from:', metadataUrl)
      const response = await fetch(metadataUrl)
      const data = await response.json()
      console.log('[Audio] Metadata response:', data)

      if (data.status === 'generating' || data.status === 'pending') {
        // Poll for completion
        await new Promise(resolve => setTimeout(resolve, 2000))
        return get().fetchAudio(sectionId)
      }

      // If cached, use the signed URL
      if (data.status === 'ready' && data.audio_url) {
        set(state => ({
          audioCache: {
            ...state.audioCache,
            [sectionId]: { url: data.audio_url, duration: data.duration_seconds || 0, status: 'ready' }
          }
        }))
        return { url: data.audio_url, duration: data.duration_seconds || 0 }
      }

      // If streaming, use the stream URL directly
      // The audio element can handle streaming audio
      if (data.status === 'streaming' && data.stream_url) {
        const streamUrl = data.stream_url
        const duration = data.duration_seconds || 0
        set(state => ({
          audioCache: {
            ...state.audioCache,
            [sectionId]: { url: streamUrl, duration, status: 'ready' }
          }
        }))
        return { url: streamUrl, duration }
      }

      throw new Error('Audio not ready')
    } catch {
      set(state => ({
        audioCache: {
          ...state.audioCache,
          [sectionId]: { url: '', duration: 0, status: 'error' }
        }
      }))
      return null
    }
  },

  // Pre-fetch next sections
  prefetchNext: (fromIndex) => {
    const { sections, audioCache, fetchAudio } = get()
    const prefetchCount = 2

    for (let i = 1; i <= prefetchCount; i++) {
      const nextIndex = fromIndex + i
      if (nextIndex < sections.length) {
        const nextSection = sections[nextIndex]
        if (!audioCache[nextSection.id]) {
          fetchAudio(nextSection.id)
        }
      }
    }
  },

  // Playback controls
  play: async () => {
    let { audioRef, sections, currentSectionIndex, fetchAudio, prefetchNext, playbackRate, progress } = get()

    // Wait for audioRef to be available (max 2 seconds)
    if (!audioRef) {
      for (let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 100))
        audioRef = get().audioRef
        if (audioRef) break
      }
    }

    if (!audioRef || sections.length === 0) {
      console.error('[Audio] Cannot play: audioRef or sections not available')
      return
    }

    const section = sections[currentSectionIndex]
    console.log('[Audio] Playing section:', section.id, section.title)

    // Load audio if not already loaded
    if (!audioRef.src || audioRef.src === '') {
      set({ isLoading: true })
      console.log('[Audio] Fetching audio for section:', section.id)
      const audio = await fetchAudio(section.id)

      if (audio) {
        console.log('[Audio] Got audio URL:', audio.url?.substring(0, 50) + '...')
        audioRef.src = audio.url
        audioRef.playbackRate = playbackRate
        set({ duration: audio.duration })

        // Seek to saved position if any
        if (progress > 0) {
          audioRef.currentTime = progress
        }
      } else {
        console.error('[Audio] Failed to fetch audio')
        set({ isLoading: false })
        return
      }
      set({ isLoading: false })
    }

    try {
      console.log('[Audio] Starting playback...')
      await audioRef.play()
      set({ isPlaying: true })
      prefetchNext(currentSectionIndex)
    } catch (err) {
      console.error('[Audio] Playback failed:', err)
    }
  },

  pause: () => {
    const { audioRef } = get()
    if (audioRef) {
      audioRef.pause()
      set({ isPlaying: false })
    }
  },

  togglePlayPause: async () => {
    const { isPlaying, play, pause } = get()
    if (isPlaying) {
      pause()
    } else {
      await play()
    }
  },

  seekTo: (seconds) => {
    const { audioRef, duration } = get()
    if (audioRef) {
      const clampedTime = Math.max(0, Math.min(seconds, duration))
      audioRef.currentTime = clampedTime
      set({ progress: clampedTime })
    }
  },

  skipForward: (seconds = 30) => {
    const { progress, duration, seekTo, nextSection, currentSectionIndex, sections } = get()
    const newTime = progress + seconds

    if (newTime >= duration && currentSectionIndex < sections.length - 1) {
      // Skip to next section with spillover
      const spillover = newTime - duration
      nextSection().then(() => {
        if (spillover > 0) {
          setTimeout(() => get().seekTo(spillover), 100)
        }
      })
    } else {
      seekTo(Math.min(newTime, duration))
    }
  },

  skipBackward: (seconds = 30) => {
    const { progress, seekTo, previousSection, currentSectionIndex, audioCache, sections } = get()
    const newTime = progress - seconds

    if (newTime < 0 && currentSectionIndex > 0) {
      // Go to previous section
      const prevSection = sections[currentSectionIndex - 1]
      const prevDuration = audioCache[prevSection.id]?.duration || 0
      const targetTime = prevDuration + newTime // newTime is negative

      previousSection().then(() => {
        if (targetTime > 0) {
          setTimeout(() => get().seekTo(targetTime), 100)
        }
      })
    } else {
      seekTo(Math.max(0, newTime))
    }
  },

  // Navigation
  goToSection: async (index) => {
    const { sections, audioRef, fetchAudio, prefetchNext, playbackRate, isPlaying } = get()
    if (index < 0 || index >= sections.length) return

    set({
      currentSectionIndex: index,
      isLoading: true,
      progress: 0
    })

    const section = sections[index]
    const audio = await fetchAudio(section.id)

    if (audio && audioRef) {
      audioRef.src = audio.url
      audioRef.playbackRate = playbackRate
      set({ duration: audio.duration, isLoading: false })

      if (isPlaying) {
        try {
          await audioRef.play()
        } catch (err) {
          console.error('Playback failed:', err)
        }
      }
    } else {
      set({ isLoading: false })
    }

    prefetchNext(index)
  },

  nextSection: async () => {
    const { currentSectionIndex, sections, goToSection } = get()
    if (currentSectionIndex < sections.length - 1) {
      await goToSection(currentSectionIndex + 1)
    }
  },

  previousSection: async () => {
    const { currentSectionIndex, progress, audioRef, goToSection } = get()

    // If more than 3 seconds in, restart current section
    if (progress > 3) {
      if (audioRef) {
        audioRef.currentTime = 0
        set({ progress: 0 })
      }
    } else if (currentSectionIndex > 0) {
      await goToSection(currentSectionIndex - 1)
    }
  },

  goToChapter: async (chapterIndex) => {
    const { chapters, goToSection } = get()
    const chapter = chapters.find(c => c.index === chapterIndex)
    if (chapter) {
      await goToSection(chapter.sectionStartIndex)
    }
  },

  // Settings
  setPlaybackRate: (rate) => {
    const { audioRef } = get()
    set({ playbackRate: rate })
    if (audioRef) {
      audioRef.playbackRate = rate
    }
  },

  cyclePlaybackRate: () => {
    const { playbackRate, setPlaybackRate } = get()
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackRate)
    const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length
    setPlaybackRate(PLAYBACK_SPEEDS[nextIndex])
  },

  // UI state
  setExpanded: (expanded) => set({ isExpanded: expanded }),
  toggleExpanded: () => set(state => ({ isExpanded: !state.isExpanded })),

  // Sleep timer
  setSleepTimer: (value) => {
    if (value === null) {
      set({ sleepTimer: { mode: 'off', endTime: null, durationMinutes: null } })
    } else if (value === 'end-of-chapter') {
      set({ sleepTimer: { mode: 'end-of-chapter', endTime: null, durationMinutes: null } })
    } else {
      set({
        sleepTimer: {
          mode: 'duration',
          endTime: Date.now() + value * 60 * 1000,
          durationMinutes: value
        }
      })
    }
  },

  checkSleepTimer: () => {
    const { sleepTimer, pause, sections, currentSectionIndex, chapters } = get()

    if (sleepTimer.mode === 'duration' && sleepTimer.endTime) {
      if (Date.now() >= sleepTimer.endTime) {
        pause()
        set({ sleepTimer: { mode: 'off', endTime: null, durationMinutes: null } })
      }
    } else if (sleepTimer.mode === 'end-of-chapter') {
      // Check if we're at the last section of current chapter
      const currentSection = sections[currentSectionIndex]
      const currentChapter = chapters.find(c => c.index === currentSection.chapterIndex)

      if (currentChapter) {
        const lastSectionOfChapter = currentChapter.sectionStartIndex + currentChapter.sectionCount - 1
        if (currentSectionIndex === lastSectionOfChapter) {
          // Will pause when this section ends (handled in handleSectionEnded)
        }
      }
    }
  },

  // Cleanup
  close: () => {
    const { audioRef } = get()
    if (audioRef) {
      audioRef.pause()
      audioRef.src = ''
    }
    set({
      isVisible: false,
      isExpanded: false,
      isPlaying: false,
      bookId: null,
      bookTitle: '',
      coverUrl: null,
      sections: [],
      chapters: [],
      currentSectionIndex: 0,
      progress: 0,
      duration: 0,
      audioCache: {},
      sleepTimer: { mode: 'off', endTime: null, durationMinutes: null },
    })
  },

  // Internal updates (called by AudioProvider)
  updateProgress: (seconds) => set({ progress: seconds }),
  updateDuration: (seconds) => set({ duration: seconds }),

  handleSectionEnded: () => {
    const { currentSectionIndex, sections, sleepTimer, pause, goToSection, chapters } = get()
    const currentSection = sections[currentSectionIndex]

    // Check end-of-chapter sleep timer
    if (sleepTimer.mode === 'end-of-chapter') {
      const currentChapter = chapters.find(c => c.index === currentSection.chapterIndex)
      if (currentChapter) {
        const lastSectionOfChapter = currentChapter.sectionStartIndex + currentChapter.sectionCount - 1
        if (currentSectionIndex === lastSectionOfChapter) {
          pause()
          set({ sleepTimer: { mode: 'off', endTime: null, durationMinutes: null } })
          return
        }
      }
    }

    // Auto-advance to next section
    if (currentSectionIndex < sections.length - 1) {
      goToSection(currentSectionIndex + 1)
    } else {
      // End of book
      set({ isPlaying: false })
    }
  },
}))

// Selector hooks for common state slices
export const useCurrentSection = () => useAudioStore(state =>
  state.sections[state.currentSectionIndex]
)

export const useCurrentChapter = () => useAudioStore(state => {
  const section = state.sections[state.currentSectionIndex]
  return section ? state.chapters.find(c => c.index === section.chapterIndex) : null
})

export const useIsAudioActive = () => useAudioStore(state => state.isVisible)
