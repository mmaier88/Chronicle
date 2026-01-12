'use client'

import { X, Check } from 'lucide-react'
import { useAudioStore } from '@/lib/audio/store'
import { SLEEP_TIMER_OPTIONS } from '@/lib/audio/types'

// Colors (hardcoded since we render outside route group CSS scope)
const colors = {
  moonLight: '#faf6ed',
  moonSoft: '#e8e0d0',
  amberWarm: '#d4a574',
}

interface SleepTimerMenuProps {
  onClose: () => void
}

export function SleepTimerMenu({ onClose }: SleepTimerMenuProps) {
  const { sleepTimer, setSleepTimer } = useAudioStore()

  const handleSelect = (value: number | 'end-of-chapter' | null) => {
    setSleepTimer(value)
    onClose()
  }

  const isSelected = (value: number | 'end-of-chapter' | null) => {
    if (value === null && sleepTimer.mode === 'off') return true
    if (value === 'end-of-chapter' && sleepTimer.mode === 'end-of-chapter') return true
    if (typeof value === 'number' && sleepTimer.mode === 'duration' && sleepTimer.durationMinutes === value) return true
    return false
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
          background: 'rgba(30, 41, 59, 0.98)',
          backdropFilter: 'blur(12px)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          overflow: 'hidden',
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
            Sleep Timer
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

        {/* Timer options */}
        <div style={{ padding: '0.5rem 0' }}>
          {SLEEP_TIMER_OPTIONS.map((option) => {
            const selected = isSelected(option.value)

            return (
              <button
                key={option.label}
                onClick={() => handleSelect(option.value)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.5rem',
                  background: selected ? 'rgba(212, 165, 116, 0.1)' : 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                <span
                  style={{
                    fontSize: '0.9375rem',
                    fontWeight: selected ? 600 : 400,
                    color: selected ? colors.amberWarm : colors.moonLight,
                  }}
                >
                  {option.label}
                </span>

                {selected && (
                  <Check
                    style={{
                      width: 20,
                      height: 20,
                      color: colors.amberWarm,
                    }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Info text */}
        {sleepTimer.mode !== 'off' && (
          <p
            style={{
              padding: '0.75rem 1.5rem 1rem',
              fontSize: '0.75rem',
              color: colors.moonSoft,
              borderTop: '1px solid rgba(250, 246, 237, 0.1)',
            }}
          >
            {sleepTimer.mode === 'end-of-chapter'
              ? 'Playback will pause at the end of the current chapter.'
              : 'Playback will pause when the timer ends.'}
          </p>
        )}

        {/* Safe area padding */}
        <div style={{ height: 'env(safe-area-inset-bottom)' }} />
      </div>
    </div>
  )
}
