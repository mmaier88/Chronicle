'use client'

import { useState, useEffect } from 'react'
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Loader2,
  List,
  Timer,
  RotateCcw,
  RotateCw,
} from 'lucide-react'
import { useAudioStore, useCurrentSection, useCurrentChapter } from '@/lib/audio/store'
import { ChapterMenu } from './ChapterMenu'
import { SleepTimerMenu } from './SleepTimerMenu'

// Colors (hardcoded since we render outside route group CSS scope)
const colors = {
  moonLight: '#faf6ed',
  moonSoft: '#e8e0d0',
  nightDeep: '#141e30',
  amberWarm: '#d4a574',
}

export function FullScreenPlayer() {
  const {
    bookTitle,
    coverUrl,
    sections,
    chapters,
    currentSectionIndex,
    isPlaying,
    isLoading,
    progress,
    duration,
    playbackRate,
    sleepTimer,
    togglePlayPause,
    seekTo,
    skipForward,
    skipBackward,
    nextSection,
    previousSection,
    cyclePlaybackRate,
    setExpanded,
  } = useAudioStore()

  const currentSection = useCurrentSection()
  const currentChapter = useCurrentChapter()

  const [showChapterMenu, setShowChapterMenu] = useState(false)
  const [showTimerMenu, setShowTimerMenu] = useState(false)
  const [sleepTimeRemaining, setSleepTimeRemaining] = useState<string | null>(null)

  // Update sleep timer countdown
  useEffect(() => {
    if (sleepTimer.mode === 'duration' && sleepTimer.endTime) {
      const updateRemaining = () => {
        const remaining = Math.max(0, sleepTimer.endTime! - Date.now())
        const mins = Math.floor(remaining / 60000)
        const secs = Math.floor((remaining % 60000) / 1000)
        setSleepTimeRemaining(`${mins}:${secs.toString().padStart(2, '0')}`)
      }
      updateRemaining()
      const interval = setInterval(updateRemaining, 1000)
      return () => clearInterval(interval)
    } else if (sleepTimer.mode === 'end-of-chapter') {
      setSleepTimeRemaining('End of chapter')
    } else {
      setSleepTimeRemaining(null)
    }
  }, [sleepTimer])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    seekTo(time)
  }

  // Calculate time remaining in current section
  const timeRemaining = duration > 0 ? duration - progress : 0

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(180deg, #1a2332 0%, #0f172a 100%)',
        zIndex: 1001,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem',
          paddingTop: 'max(1rem, env(safe-area-inset-top))',
        }}
      >
        <button
          onClick={() => setExpanded(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem',
            background: 'transparent',
            border: 'none',
            color: colors.moonSoft,
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          <ChevronDown style={{ width: 24, height: 24 }} />
        </button>

        <h2
          style={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: colors.moonLight,
            textAlign: 'center',
            flex: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            padding: '0 1rem',
          }}
        >
          {bookTitle}
        </h2>

        <div style={{ width: 40 }} /> {/* Spacer for balance */}
      </div>

      {/* Cover Art */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem 2rem',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 320,
            aspectRatio: '1',
            borderRadius: 16,
            background: coverUrl
              ? `url(${coverUrl}) center/cover`
              : `linear-gradient(135deg, rgba(212, 165, 116, 0.3), rgba(212, 165, 116, 0.1))`,
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)',
          }}
        />
      </div>

      {/* Chapter Title - Tappable */}
      <button
        onClick={() => setShowChapterMenu(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1.5rem',
          margin: '0 auto',
          background: 'rgba(250, 246, 237, 0.08)',
          border: '1px solid rgba(250, 246, 237, 0.15)',
          borderRadius: 50,
          color: colors.moonLight,
          cursor: 'pointer',
        }}
      >
        <List style={{ width: 18, height: 18, color: colors.amberWarm }} />
        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
          {currentChapter?.title || currentSection?.chapterTitle || 'Chapter'}
        </span>
      </button>

      {/* Progress Section */}
      <div style={{ padding: '1.5rem 1.5rem 1rem' }}>
        {/* Progress Bar */}
        <div style={{ position: 'relative' }}>
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={progress}
            onChange={handleSeek}
            style={{
              width: '100%',
              height: 4,
              background: 'rgba(250, 246, 237, 0.2)',
              borderRadius: 9999,
              appearance: 'none',
              cursor: 'pointer',
            }}
          />

          {/* Chapter markers */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '0.75rem',
            }}
          >
            {chapters.map((chapter) => (
              <div
                key={chapter.index}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background:
                    currentSection?.chapterIndex === chapter.index
                      ? colors.amberWarm
                      : 'rgba(250, 246, 237, 0.4)',
                  transition: 'background 0.2s',
                }}
              />
            ))}
          </div>
        </div>

        {/* Time display */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '0.5rem',
          }}
        >
          <span
            style={{
              fontSize: '0.75rem',
              color: colors.moonSoft,
              fontFamily: 'monospace',
            }}
          >
            {formatTime(progress)}
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              color: colors.moonSoft,
            }}
          >
            {formatTime(timeRemaining)} left
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              color: colors.moonSoft,
              fontFamily: 'monospace',
            }}
          >
            -{formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Main Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '0 1.5rem 1.5rem',
        }}
      >
        {/* Skip back 30s */}
        <button
          onClick={() => skipBackward(30)}
          style={{
            position: 'relative',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: colors.moonLight,
            cursor: 'pointer',
          }}
        >
          <RotateCcw style={{ width: 28, height: 28 }} />
          <span
            style={{
              position: 'absolute',
              fontSize: '0.625rem',
              fontWeight: 600,
              color: colors.moonLight,
            }}
          >
            30
          </span>
        </button>

        {/* Previous section */}
        <button
          onClick={() => previousSection()}
          disabled={currentSectionIndex === 0 && progress < 3}
          style={{
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: colors.moonLight,
            cursor: 'pointer',
            opacity: currentSectionIndex === 0 && progress < 3 ? 0.3 : 1,
          }}
        >
          <SkipBack style={{ width: 28, height: 28 }} />
        </button>

        {/* Play/Pause */}
        <button
          onClick={() => togglePlayPause()}
          disabled={isLoading}
          style={{
            width: 72,
            height: 72,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: colors.moonLight,
            border: 'none',
            borderRadius: '50%',
            color: colors.nightDeep,
            cursor: isLoading ? 'wait' : 'pointer',
          }}
        >
          {isLoading ? (
            <Loader2 style={{ width: 32, height: 32, animation: 'spin 1s linear infinite' }} />
          ) : isPlaying ? (
            <Pause style={{ width: 32, height: 32 }} />
          ) : (
            <Play style={{ width: 32, height: 32, marginLeft: 4 }} />
          )}
        </button>

        {/* Next section */}
        <button
          onClick={() => nextSection()}
          disabled={currentSectionIndex >= sections.length - 1}
          style={{
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: colors.moonLight,
            cursor: 'pointer',
            opacity: currentSectionIndex >= sections.length - 1 ? 0.3 : 1,
          }}
        >
          <SkipForward style={{ width: 28, height: 28 }} />
        </button>

        {/* Skip forward 30s */}
        <button
          onClick={() => skipForward(30)}
          style={{
            position: 'relative',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: colors.moonLight,
            cursor: 'pointer',
          }}
        >
          <RotateCw style={{ width: 28, height: 28 }} />
          <span
            style={{
              position: 'absolute',
              fontSize: '0.625rem',
              fontWeight: 600,
              color: colors.moonLight,
            }}
          >
            30
          </span>
        </button>
      </div>

      {/* Secondary Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: '1rem 1.5rem',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
          borderTop: '1px solid rgba(250, 246, 237, 0.15)',
        }}
      >
        {/* Playback speed */}
        <button
          onClick={cyclePlaybackRate}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.5rem 1rem',
            background: 'transparent',
            border: 'none',
            color: colors.moonLight,
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: '1rem', fontWeight: 600 }}>{playbackRate}x</span>
          <span style={{ fontSize: '0.625rem', textTransform: 'uppercase', opacity: 0.7 }}>Speed</span>
        </button>

        {/* Sleep Timer */}
        <button
          onClick={() => setShowTimerMenu(true)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.5rem 1rem',
            background: 'transparent',
            border: 'none',
            color: sleepTimeRemaining ? colors.amberWarm : colors.moonLight,
            cursor: 'pointer',
          }}
        >
          <Timer style={{ width: 24, height: 24 }} />
          <span style={{ fontSize: '0.625rem', textTransform: 'uppercase', opacity: sleepTimeRemaining ? 1 : 0.7 }}>
            {sleepTimeRemaining || 'Timer'}
          </span>
        </button>
      </div>

      {/* Menus */}
      {showChapterMenu && <ChapterMenu onClose={() => setShowChapterMenu(false)} />}
      {showTimerMenu && <SleepTimerMenu onClose={() => setShowTimerMenu(false)} />}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: ${colors.amberWarm};
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  )
}
