'use client'

import { Play, Pause, Loader2, ChevronUp, X } from 'lucide-react'
import { useAudioStore, useCurrentSection } from '@/lib/audio/store'

// Colors (hardcoded since we render outside route group CSS scope)
const colors = {
  moonLight: '#faf6ed',
  moonSoft: '#e8e0d0',
  nightDeep: '#141e30',
  amberWarm: '#d4a574',
  amberGlow: '#e8c49a',
}

export function MiniPlayer() {
  const {
    bookTitle,
    coverUrl,
    isPlaying,
    isLoading,
    progress,
    duration,
    togglePlayPause,
    setExpanded,
    close,
  } = useAudioStore()

  const currentSection = useCurrentSection()

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
        background: 'rgba(20, 30, 48, 0.98)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(250, 246, 237, 0.1)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Progress bar at top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'rgba(250, 246, 237, 0.1)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: colors.amberWarm,
            transition: 'width 0.1s linear',
          }}
        />
      </div>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          padding: '0 1rem',
          gap: '0.75rem',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(true)}
      >
        {/* Cover thumbnail */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 8,
            background: coverUrl
              ? `url(${coverUrl}) center/cover`
              : `linear-gradient(135deg, rgba(212, 165, 116, 0.3), rgba(212, 165, 116, 0.1))`,
            flexShrink: 0,
          }}
        />

        {/* Title & Chapter */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: '0.875rem',
              fontWeight: 500,
              color: colors.moonLight,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginBottom: 2,
            }}
          >
            {bookTitle}
          </p>
          <p
            style={{
              fontSize: '0.75rem',
              color: colors.amberWarm,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {currentSection?.chapterTitle}
          </p>
        </div>

        {/* Time */}
        <span
          style={{
            fontSize: '0.75rem',
            color: colors.moonSoft,
            fontFamily: 'monospace',
            flexShrink: 0,
          }}
        >
          {formatTime(progress)}
        </span>

        {/* Play/Pause */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            togglePlayPause()
          }}
          disabled={isLoading}
          style={{
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${colors.amberWarm}, ${colors.amberGlow})`,
            border: 'none',
            borderRadius: '50%',
            color: colors.nightDeep,
            cursor: isLoading ? 'wait' : 'pointer',
            flexShrink: 0,
          }}
        >
          {isLoading ? (
            <Loader2 style={{ width: 22, height: 22, animation: 'spin 1s linear infinite' }} />
          ) : isPlaying ? (
            <Pause style={{ width: 22, height: 22 }} />
          ) : (
            <Play style={{ width: 22, height: 22, marginLeft: 2 }} />
          )}
        </button>

        {/* Expand button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setExpanded(true)
          }}
          style={{
            padding: '0.5rem',
            background: 'transparent',
            border: 'none',
            color: colors.moonSoft,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <ChevronUp style={{ width: 20, height: 20 }} />
        </button>

        {/* Close button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            close()
          }}
          style={{
            padding: '0.5rem',
            background: 'transparent',
            border: 'none',
            color: colors.moonSoft,
            cursor: 'pointer',
            opacity: 0.6,
            flexShrink: 0,
          }}
        >
          <X style={{ width: 18, height: 18 }} />
        </button>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
