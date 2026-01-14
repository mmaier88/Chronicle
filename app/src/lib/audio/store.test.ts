import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useAudioStore } from './store'
import type { AudioSection } from './types'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock URL.createObjectURL
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.createObjectURL = mockCreateObjectURL

// Helper to create a mock blob with valid MP3 header
function createMockMP3Blob(size: number = 2004): Blob {
  const mp3Header = new Uint8Array([0xFF, 0xFB, 0x90, 0x00])
  const padding = new Uint8Array(size - mp3Header.length)
  const mp3Data = new Uint8Array(mp3Header.length + padding.length)
  mp3Data.set(mp3Header)
  mp3Data.set(padding, mp3Header.length)
  return new Blob([mp3Data], { type: 'audio/mpeg' })
}

describe('Audio Store', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAudioStore.setState({
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
    })
    mockFetch.mockClear()
    mockCreateObjectURL.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('loadBook', () => {
    const mockSections: AudioSection[] = [
      { id: 'section-1', title: 'Section 1', chapterIndex: 0, chapterTitle: 'Chapter 1', sectionIndex: 0 },
      { id: 'section-2', title: 'Section 2', chapterIndex: 0, chapterTitle: 'Chapter 1', sectionIndex: 1 },
      { id: 'section-3', title: 'Section 3', chapterIndex: 1, chapterTitle: 'Chapter 2', sectionIndex: 0 },
    ]
    const mockGetEndpoint = (id: string) => `/api/tts/section/${id}`

    it('loads book data correctly', () => {
      const { loadBook } = useAudioStore.getState()

      loadBook('book-1', 'Test Book', 'http://cover.jpg', mockSections, mockGetEndpoint)

      const state = useAudioStore.getState()
      expect(state.bookId).toBe('book-1')
      expect(state.bookTitle).toBe('Test Book')
      expect(state.coverUrl).toBe('http://cover.jpg')
      expect(state.sections).toHaveLength(3)
      expect(state.isVisible).toBe(true)
      expect(state.isExpanded).toBe(true)
    })

    it('derives chapters from sections', () => {
      const { loadBook } = useAudioStore.getState()

      loadBook('book-1', 'Test Book', null, mockSections, mockGetEndpoint)

      const state = useAudioStore.getState()
      expect(state.chapters).toHaveLength(2)
      expect(state.chapters[0].title).toBe('Chapter 1')
      expect(state.chapters[0].sectionCount).toBe(2)
      expect(state.chapters[1].title).toBe('Chapter 2')
      expect(state.chapters[1].sectionCount).toBe(1)
    })

    it('restores saved progress', () => {
      const { loadBook } = useAudioStore.getState()

      loadBook('book-1', 'Test Book', null, mockSections, mockGetEndpoint, {
        sectionId: 'section-2',
        offsetMs: 30000,
        playbackSpeed: 1.5,
      })

      const state = useAudioStore.getState()
      expect(state.currentSectionIndex).toBe(1) // section-2 is at index 1
      expect(state.progress).toBe(30) // 30000ms = 30s
      expect(state.playbackRate).toBe(1.5)
    })

    it('clears audio cache when loading new book', () => {
      // Set some existing cache
      useAudioStore.setState({
        audioCache: { 'old-section': { url: 'blob:old', duration: 60, status: 'ready' } }
      })

      const { loadBook } = useAudioStore.getState()
      loadBook('book-1', 'Test Book', null, mockSections, mockGetEndpoint)

      const state = useAudioStore.getState()
      expect(state.audioCache).toEqual({})
    })
  })

  describe('fetchAudio', () => {
    const mockSection: AudioSection = {
      id: 'section-1',
      title: 'Test Section',
      chapterIndex: 0,
      chapterTitle: 'Chapter 1',
      sectionIndex: 0,
    }

    beforeEach(() => {
      useAudioStore.setState({
        sections: [mockSection],
        getAudioEndpoint: (id: string) => `/api/tts/section/${id}`,
      })
    })

    it('returns cached audio if status is ready', async () => {
      useAudioStore.setState({
        audioCache: {
          'section-1': { url: 'blob:cached-url', duration: 120, status: 'ready' }
        }
      })

      const { fetchAudio } = useAudioStore.getState()
      const result = await fetchAudio('section-1')

      expect(result).toEqual({ url: 'blob:cached-url', duration: 120 })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    // Note: This test requires blob.arrayBuffer() which jsdom doesn't support
    it.skip('re-fetches if cache status is error (browser only)', async () => {
      useAudioStore.setState({
        audioCache: {
          'section-1': { url: '', duration: 0, status: 'error' }
        }
      })

      // Mock metadata response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'streaming' })
      })

      // Mock MP3 data for stream response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'audio/mpeg' }),
        blob: async () => createMockMP3Blob()
      })

      const { fetchAudio } = useAudioStore.getState()
      const result = await fetchAudio('section-1')

      expect(mockFetch).toHaveBeenCalled()
      expect(result).not.toBeNull()
    })

    it('returns null if getAudioEndpoint is not set', async () => {
      useAudioStore.setState({ getAudioEndpoint: null })

      const { fetchAudio } = useAudioStore.getState()
      const result = await fetchAudio('section-1')

      expect(result).toBeNull()
    })

    // Note: These tests require blob.arrayBuffer() which jsdom doesn't support
    it.skip('handles ready status with audio_url (browser only)', async () => {
      // Mock metadata response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ready',
          audio_url: 'https://storage.example.com/audio.mp3',
          duration_seconds: 180
        })
      })

      // Mock audio fetch with valid MP3
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => createMockMP3Blob()
      })

      const { fetchAudio } = useAudioStore.getState()
      const result = await fetchAudio('section-1')

      expect(result).not.toBeNull()
      expect(result?.url).toBe('blob:mock-url')
      expect(result?.duration).toBe(180)
    })

    it.skip('handles streaming status (browser only)', async () => {
      // Mock metadata response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'streaming', duration_seconds: 60 })
      })

      // Mock stream endpoint response with valid MP3
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'audio/mpeg' }),
        blob: async () => createMockMP3Blob()
      })

      const { fetchAudio } = useAudioStore.getState()
      const result = await fetchAudio('section-1')

      expect(result).not.toBeNull()
      // Verify the configured endpoint was called (not hardcoded simple endpoint)
      expect(mockFetch).toHaveBeenLastCalledWith('/api/tts/section/section-1')
    })

    it('sets error status in cache when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { fetchAudio } = useAudioStore.getState()
      const result = await fetchAudio('section-1')

      expect(result).toBeNull()
      const state = useAudioStore.getState()
      expect(state.audioCache['section-1'].status).toBe('error')
    })

    it('uses custom endpoint for shared audio (not hardcoded simple endpoint)', async () => {
      // This test ensures shared audio uses the correct endpoint
      // Bug fix: previously fell back to /api/tts/simple/ which requires ownership
      const sharedToken = 'abc123'
      const sharedEndpoint = (id: string) => `/api/tts/shared/${sharedToken}/section/${id}`

      useAudioStore.setState({
        sections: [mockSection],
        getAudioEndpoint: sharedEndpoint,
      })

      // Mock metadata response indicating streaming is needed
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'streaming', duration_seconds: 60 })
      })

      // Mock the stream response - will fail but we just want to verify the URL
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Test error'
      })

      const { fetchAudio } = useAudioStore.getState()
      await fetchAudio('section-1')

      // Verify the shared endpoint was called, NOT /api/tts/simple/
      const calls = mockFetch.mock.calls
      expect(calls[0][0]).toBe('/api/tts/shared/abc123/section/section-1?metadata=true')
      expect(calls[1][0]).toBe('/api/tts/shared/abc123/section/section-1')
    })

    it.skip('rejects small/empty audio blobs (browser only)', async () => {
      // Mock metadata response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ready',
          audio_url: 'https://storage.example.com/audio.mp3'
        })
      })

      // Mock audio fetch returning tiny blob (simulating empty cached audio)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['tiny'], { type: 'audio/mpeg' })
      })

      // Mock simple endpoint fallback with valid MP3
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => createMockMP3Blob()
      })

      const { fetchAudio } = useAudioStore.getState()
      const result = await fetchAudio('section-1')

      // Should have fallen back to simple endpoint
      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(result).not.toBeNull()
    })
  })

  describe('playback controls', () => {
    it('seekTo clamps to valid range', () => {
      const mockAudioRef = { currentTime: 0 } as HTMLAudioElement
      useAudioStore.setState({
        audioRef: mockAudioRef,
        duration: 100,
      })

      const { seekTo } = useAudioStore.getState()

      seekTo(50)
      expect(useAudioStore.getState().progress).toBe(50)

      seekTo(-10)
      expect(useAudioStore.getState().progress).toBe(0)

      seekTo(150)
      expect(useAudioStore.getState().progress).toBe(100)
    })

    it('setPlaybackRate updates rate and audio element', () => {
      const mockAudioRef = { playbackRate: 1 } as HTMLAudioElement
      useAudioStore.setState({ audioRef: mockAudioRef })

      const { setPlaybackRate } = useAudioStore.getState()
      setPlaybackRate(1.5)

      expect(useAudioStore.getState().playbackRate).toBe(1.5)
      expect(mockAudioRef.playbackRate).toBe(1.5)
    })

    it('cyclePlaybackRate cycles through speeds', () => {
      const mockAudioRef = { playbackRate: 1 } as HTMLAudioElement
      useAudioStore.setState({ audioRef: mockAudioRef, playbackRate: 1 })

      const { cyclePlaybackRate } = useAudioStore.getState()

      cyclePlaybackRate()
      expect(useAudioStore.getState().playbackRate).toBe(1.25)

      cyclePlaybackRate()
      expect(useAudioStore.getState().playbackRate).toBe(1.5)

      cyclePlaybackRate()
      expect(useAudioStore.getState().playbackRate).toBe(2)

      cyclePlaybackRate()
      expect(useAudioStore.getState().playbackRate).toBe(0.75) // wraps around
    })
  })

  describe('sleep timer', () => {
    it('sets duration-based timer', () => {
      const { setSleepTimer } = useAudioStore.getState()

      setSleepTimer(15)

      const state = useAudioStore.getState()
      expect(state.sleepTimer.mode).toBe('duration')
      expect(state.sleepTimer.durationMinutes).toBe(15)
      expect(state.sleepTimer.endTime).toBeGreaterThan(Date.now())
    })

    it('sets end-of-chapter timer', () => {
      const { setSleepTimer } = useAudioStore.getState()

      setSleepTimer('end-of-chapter')

      const state = useAudioStore.getState()
      expect(state.sleepTimer.mode).toBe('end-of-chapter')
      expect(state.sleepTimer.endTime).toBeNull()
    })

    it('clears timer with null', () => {
      useAudioStore.setState({
        sleepTimer: { mode: 'duration', endTime: Date.now() + 60000, durationMinutes: 1 }
      })

      const { setSleepTimer } = useAudioStore.getState()
      setSleepTimer(null)

      const state = useAudioStore.getState()
      expect(state.sleepTimer.mode).toBe('off')
    })
  })

  describe('close', () => {
    it('resets all state', () => {
      const mockAudioRef = {
        pause: vi.fn(),
        src: 'blob:test'
      } as unknown as HTMLAudioElement

      useAudioStore.setState({
        audioRef: mockAudioRef,
        bookId: 'book-1',
        isPlaying: true,
        isVisible: true,
        sections: [{ id: '1', title: 'Test', chapterIndex: 0, chapterTitle: 'Ch 1', sectionIndex: 0 }],
      })

      const { close } = useAudioStore.getState()
      close()

      expect(mockAudioRef.pause).toHaveBeenCalled()
      expect(mockAudioRef.src).toBe('')

      const state = useAudioStore.getState()
      expect(state.bookId).toBeNull()
      expect(state.isPlaying).toBe(false)
      expect(state.isVisible).toBe(false)
      expect(state.sections).toHaveLength(0)
    })
  })
})
