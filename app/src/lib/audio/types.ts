// Audio system types for Chronicle Audio First experience

export interface AudioSection {
  id: string
  title: string
  chapterTitle: string
  chapterIndex: number
  sectionIndex: number
}

export interface AudioChapter {
  index: number
  title: string
  sectionStartIndex: number // Index in flat sections array
  sectionCount: number
  estimatedDuration: number // seconds
}

export interface AudioCache {
  [sectionId: string]: {
    url: string
    duration: number
    status: 'loading' | 'ready' | 'error'
  }
}

export interface AudioBook {
  id: string
  title: string
  coverUrl: string | null
  sections: AudioSection[]
  chapters: AudioChapter[]
}

export interface SavedAudioProgress {
  sectionId: string
  offsetMs: number
  playbackSpeed: number
}

export type SleepTimerMode = 'off' | 'duration' | 'end-of-chapter'

export interface SleepTimerState {
  mode: SleepTimerMode
  endTime: number | null // timestamp when timer expires
  durationMinutes: number | null
}

export const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const
export type PlaybackSpeed = typeof PLAYBACK_SPEEDS[number]

export const SLEEP_TIMER_OPTIONS = [
  { label: 'Off', value: null },
  { label: '5 minutes', value: 5 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '45 minutes', value: 45 },
  { label: '1 hour', value: 60 },
  { label: 'End of chapter', value: 'end-of-chapter' },
] as const
