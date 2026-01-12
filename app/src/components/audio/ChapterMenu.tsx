'use client'

import { X, Volume2 } from 'lucide-react'
import { useAudioStore, useCurrentSection } from '@/lib/audio/store'

// Colors (hardcoded since we render outside route group CSS scope)
const colors = {
  moonLight: '#faf6ed',
  moonSoft: '#e8e0d0',
  nightDeep: '#141e30',
  amberWarm: '#d4a574',
}

interface ChapterMenuProps {
  onClose: () => void
}

export function ChapterMenu({ onClose }: ChapterMenuProps) {
  const { chapters, audioCache, sections, goToChapter } = useAudioStore()
  const currentSection = useCurrentSection()

  const handleChapterClick = (chapterIndex: number) => {
    goToChapter(chapterIndex)
    onClose()
  }

  // Calculate chapter duration from cached audio
  const getChapterDuration = (chapter: typeof chapters[0]) => {
    let totalDuration = 0
    for (let i = 0; i < chapter.sectionCount; i++) {
      const section = sections[chapter.sectionStartIndex + i]
      if (section && audioCache[section.id]?.duration) {
        totalDuration += audioCache[section.id].duration
      }
    }
    return totalDuration
  }

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return ''
    const mins = Math.floor(seconds / 60)
    if (mins >= 60) {
      const hours = Math.floor(mins / 60)
      const remainingMins = mins % 60
      return `${hours}h ${remainingMins}m`
    }
    return `${mins} min`
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        zIndex: 1002,
        display: 'flex',
        alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxHeight: '70vh',
          background: 'rgba(30, 41, 59, 0.98)',
          backdropFilter: 'blur(12px)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(250, 246, 237, 0.1)',
          }}
        >
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: colors.moonLight,
            }}
          >
            Chapters
          </h3>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem',
              background: 'transparent',
              border: 'none',
              color: colors.moonSoft,
              cursor: 'pointer',
            }}
          >
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Chapter list */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0.5rem 0',
          }}
        >
          {chapters.map((chapter) => {
            const isCurrentChapter = currentSection?.chapterIndex === chapter.index
            const duration = getChapterDuration(chapter)

            return (
              <button
                key={chapter.index}
                onClick={() => handleChapterClick(chapter.index)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.5rem',
                  background: isCurrentChapter ? 'rgba(212, 165, 116, 0.1)' : 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                {/* Chapter number */}
                <span
                  style={{
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    background: isCurrentChapter
                      ? colors.amberWarm
                      : 'rgba(250, 246, 237, 0.1)',
                    color: isCurrentChapter ? colors.nightDeep : colors.moonSoft,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    flexShrink: 0,
                  }}
                >
                  {chapter.index + 1}
                </span>

                {/* Title and duration */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: '0.9375rem',
                      fontWeight: isCurrentChapter ? 600 : 400,
                      color: isCurrentChapter ? colors.amberWarm : colors.moonLight,
                      marginBottom: duration ? 4 : 0,
                    }}
                  >
                    {chapter.title}
                  </p>
                  {duration > 0 && (
                    <p
                      style={{
                        fontSize: '0.75rem',
                        color: colors.moonSoft,
                      }}
                    >
                      {formatDuration(duration)}
                    </p>
                  )}
                </div>

                {/* Now playing indicator */}
                {isCurrentChapter && (
                  <Volume2
                    style={{
                      width: 18,
                      height: 18,
                      color: colors.amberWarm,
                      flexShrink: 0,
                    }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Safe area padding */}
        <div style={{ height: 'env(safe-area-inset-bottom)' }} />
      </div>
    </div>
  )
}
