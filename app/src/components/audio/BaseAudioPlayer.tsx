'use client'

import { useState, useRef, useCallback } from 'react'
import { Play, Pause, SkipBack, SkipForward, Loader2, Volume2, X } from 'lucide-react'

interface Section {
  id: string
  title: string
  chapterTitle: string
  chapterIndex: number
  sectionIndex: number
}

interface BaseAudioPlayerProps {
  bookTitle: string
  sections: Section[]
  getAudioEndpoint: (sectionId: string) => string
}

interface AudioCache {
  [sectionId: string]: {
    url: string
    duration: number
    status: 'loading' | 'ready' | 'error'
  }
}

export function BaseAudioPlayer({ bookTitle, sections, getAudioEndpoint }: BaseAudioPlayerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [audioCache, setAudioCache] = useState<AudioCache>({})
  const [isLoadingCurrent, setIsLoadingCurrent] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const currentSection = sections[currentIndex]
  const totalSections = sections.length

  // Fetch audio for a section
  const fetchAudio = useCallback(async (sectionId: string): Promise<{ url: string; duration: number } | null> => {
    // Check cache first
    if (audioCache[sectionId]?.status === 'ready') {
      return { url: audioCache[sectionId].url, duration: audioCache[sectionId].duration }
    }

    // Mark as loading
    setAudioCache(prev => ({
      ...prev,
      [sectionId]: { url: '', duration: 0, status: 'loading' }
    }))

    try {
      const response = await fetch(getAudioEndpoint(sectionId))
      const data = await response.json()

      if (data.status === 'generating' || data.status === 'pending') {
        // Poll for completion
        await new Promise(resolve => setTimeout(resolve, 2000))
        return fetchAudio(sectionId)
      }

      if (data.status === 'ready' && data.audio_url) {
        setAudioCache(prev => ({
          ...prev,
          [sectionId]: { url: data.audio_url, duration: data.duration_seconds || 0, status: 'ready' }
        }))
        return { url: data.audio_url, duration: data.duration_seconds || 0 }
      }

      throw new Error('Audio not ready')
    } catch {
      setAudioCache(prev => ({
        ...prev,
        [sectionId]: { url: '', duration: 0, status: 'error' }
      }))
      return null
    }
  }, [audioCache, getAudioEndpoint])

  // Pre-fetch next sections
  const prefetchNext = useCallback(async (fromIndex: number) => {
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
  }, [sections, audioCache, fetchAudio])

  // Load and play current section
  const loadAndPlay = useCallback(async (index: number) => {
    if (index < 0 || index >= sections.length) return

    setCurrentIndex(index)
    setIsLoadingCurrent(true)
    setProgress(0)

    const section = sections[index]
    const audio = await fetchAudio(section.id)

    if (audio && audioRef.current) {
      audioRef.current.src = audio.url
      audioRef.current.playbackRate = playbackRate
      setDuration(audio.duration)

      try {
        await audioRef.current.play()
        setIsPlaying(true)
      } catch (err) {
        console.error('Playback failed:', err)
      }
    }

    setIsLoadingCurrent(false)
    prefetchNext(index)
  }, [sections, fetchAudio, prefetchNext, playbackRate])

  // Handle play/pause
  const handlePlayPause = async () => {
    if (!isOpen) {
      setIsOpen(true)
      await loadAndPlay(0)
      return
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        if (!audioRef.current.src) {
          await loadAndPlay(currentIndex)
        } else {
          await audioRef.current.play()
          setIsPlaying(true)
        }
      }
    }
  }

  const handleNext = () => {
    if (currentIndex < sections.length - 1) {
      loadAndPlay(currentIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0
    } else if (currentIndex > 0) {
      loadAndPlay(currentIndex - 1)
    }
  }

  const handleEnded = () => {
    if (currentIndex < sections.length - 1) {
      loadAndPlay(currentIndex + 1)
    } else {
      setIsPlaying(false)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setProgress(time)
    }
  }

  const handleSpeedChange = () => {
    const speeds = [0.75, 1, 1.25, 1.5, 2]
    const currentSpeedIndex = speeds.indexOf(playbackRate)
    const nextIndex = (currentSpeedIndex + 1) % speeds.length
    const newRate = speeds[nextIndex]
    setPlaybackRate(newRate)
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate
    }
  }

  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    setIsPlaying(false)
    setIsOpen(false)
    setCurrentIndex(0)
    setProgress(0)
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getLoadingStatus = () => {
    const nextSection = sections[currentIndex + 1]
    if (nextSection && audioCache[nextSection.id]?.status === 'loading') {
      return 'Preparing next section...'
    }
    return null
  }

  // Closed state - show listen button
  if (!isOpen) {
    return (
      <button
        onClick={handlePlayPause}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1.25rem',
          background: 'rgba(212, 165, 116, 0.15)',
          border: '1px solid rgba(212, 165, 116, 0.3)',
          borderRadius: 50,
          color: 'var(--amber-warm)',
          fontSize: '0.875rem',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <Volume2 style={{ width: 18, height: 18 }} />
        Listen to this book
      </button>
    )
  }

  // Open player
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'rgba(20, 30, 48, 0.98)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(250, 246, 237, 0.1)',
      padding: '1rem 1.5rem',
      zIndex: 100,
    }}>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />

      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Section info */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--amber-warm)', marginBottom: '0.25rem' }}>
              {currentSection?.chapterTitle} · Section {currentIndex + 1} of {totalSections}
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--moon-light)', fontWeight: 500 }}>
              {currentSection?.title}
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              padding: '0.5rem',
              background: 'transparent',
              border: 'none',
              color: 'var(--moon-soft)',
              cursor: 'pointer',
              opacity: 0.6,
            }}
          >
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0 && progress < 3}
            style={{
              padding: '0.5rem',
              background: 'transparent',
              border: 'none',
              color: 'var(--moon-soft)',
              cursor: 'pointer',
              opacity: currentIndex === 0 && progress < 3 ? 0.3 : 0.8,
            }}
          >
            <SkipBack style={{ width: 20, height: 20 }} />
          </button>

          <button
            onClick={handlePlayPause}
            disabled={isLoadingCurrent}
            style={{
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, var(--amber-warm), var(--amber-glow))',
              border: 'none',
              borderRadius: '50%',
              color: 'var(--night-deep)',
              cursor: isLoadingCurrent ? 'wait' : 'pointer',
            }}
          >
            {isLoadingCurrent ? (
              <Loader2 style={{ width: 24, height: 24, animation: 'spin 1s linear infinite' }} />
            ) : isPlaying ? (
              <Pause style={{ width: 24, height: 24 }} />
            ) : (
              <Play style={{ width: 24, height: 24, marginLeft: 2 }} />
            )}
          </button>

          <button
            onClick={handleNext}
            disabled={currentIndex >= sections.length - 1}
            style={{
              padding: '0.5rem',
              background: 'transparent',
              border: 'none',
              color: 'var(--moon-soft)',
              cursor: 'pointer',
              opacity: currentIndex >= sections.length - 1 ? 0.3 : 0.8,
            }}
          >
            <SkipForward style={{ width: 20, height: 20 }} />
          </button>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--moon-soft)', fontFamily: 'monospace', width: 40 }}>
              {formatTime(progress)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={progress}
              onChange={handleSeek}
              style={{
                flex: 1,
                height: 4,
                background: 'rgba(250, 246, 237, 0.15)',
                borderRadius: 9999,
                appearance: 'none',
                cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--moon-soft)', fontFamily: 'monospace', width: 40 }}>
              {formatTime(duration)}
            </span>
          </div>

          <button
            onClick={handleSpeedChange}
            style={{
              padding: '0.375rem 0.625rem',
              background: 'rgba(250, 246, 237, 0.1)',
              border: 'none',
              borderRadius: 6,
              color: 'var(--moon-soft)',
              fontSize: '0.75rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {playbackRate}x
          </button>
        </div>

        {getLoadingStatus() && (
          <p style={{ fontSize: '0.75rem', color: 'var(--amber-warm)', marginTop: '0.5rem', opacity: 0.7 }}>
            {getLoadingStatus()}
          </p>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          background: var(--amber-warm);
          border-radius: 50%;
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}
