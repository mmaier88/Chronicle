'use client'

import { useEffect, useRef } from 'react'
import { useAudioStore } from '@/lib/audio/store'
import { useAudioProgressSync } from '@/lib/audio/useAudioProgressSync'
import { MiniPlayer } from './MiniPlayer'
import { FullScreenPlayer } from './FullScreenPlayer'

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const {
    isVisible,
    isExpanded,
    setAudioRef,
    updateProgress,
    updateDuration,
    handleSectionEnded,
    checkSleepTimer,
    sleepTimer,
  } = useAudioStore()

  // Sync progress to database
  useAudioProgressSync()

  // Set audio ref on mount
  useEffect(() => {
    setAudioRef(audioRef.current)
  }, [setAudioRef])

  // Sleep timer checker
  useEffect(() => {
    if (sleepTimer.mode === 'duration' && sleepTimer.endTime) {
      const interval = setInterval(checkSleepTimer, 1000)
      return () => clearInterval(interval)
    }
  }, [sleepTimer.mode, sleepTimer.endTime, checkSleepTimer])

  const handleAudioError = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget
    const error = audio.error
    console.error('[AudioProvider] Audio error:', error?.code, error?.message)

    // Reset loading state
    useAudioStore.getState().pause()
    useAudioStore.setState({ isLoading: false })

    // Show user-friendly error
    const errorMessages: Record<number, string> = {
      1: 'Audio loading was aborted',
      2: 'Network error while loading audio',
      3: 'Audio decoding failed',
      4: 'Audio format not supported',
    }
    const message = error ? errorMessages[error.code] || 'Unknown audio error' : 'Audio playback failed'
    alert(`Audio Error: ${message}. Please try again.`)
  }

  const handleCanPlay = () => {
    console.log('[AudioProvider] Audio can play')
  }

  const handleLoadStart = () => {
    console.log('[AudioProvider] Audio load started')
  }

  const handleWaiting = () => {
    console.log('[AudioProvider] Audio waiting/buffering')
  }

  return (
    <>
      {children}

      {/* Hidden audio element managed by store */}
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => updateProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          console.log('[AudioProvider] Metadata loaded, duration:', e.currentTarget.duration)
          updateDuration(e.currentTarget.duration)
        }}
        onEnded={handleSectionEnded}
        onError={handleAudioError}
        onCanPlay={handleCanPlay}
        onLoadStart={handleLoadStart}
        onWaiting={handleWaiting}
        preload="auto"
        crossOrigin="anonymous"
      />

      {/* Player UI - conditionally rendered based on state */}
      {isVisible && !isExpanded && <MiniPlayer />}
      {isVisible && isExpanded && <FullScreenPlayer />}
    </>
  )
}
