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

  return (
    <>
      {children}

      {/* Hidden audio element managed by store */}
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => updateProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => updateDuration(e.currentTarget.duration)}
        onEnded={handleSectionEnded}
        preload="auto"
      />

      {/* Player UI - conditionally rendered based on state */}
      {isVisible && !isExpanded && <MiniPlayer />}
      {isVisible && isExpanded && <FullScreenPlayer />}
    </>
  )
}
