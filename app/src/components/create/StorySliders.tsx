'use client'

import { RotateCcw, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import type { StorySliders, SliderValue } from '@/types/chronicle'
import { SLIDER_CONFIG, VISIBLE_SLIDERS, ADVANCED_SLIDERS } from '@/lib/slider-config'

interface StorySlidersProps {
  sliders: StorySliders
  onChange: (sliders: StorySliders) => void
  showAdvanced: boolean
  onToggleAdvanced: () => void
  disabled?: boolean
}

export function StorySliders({
  sliders,
  onChange,
  showAdvanced,
  onToggleAdvanced,
  disabled = false,
}: StorySlidersProps) {
  const handleSliderChange = (key: keyof StorySliders, value: SliderValue) => {
    onChange({ ...sliders, [key]: value })
  }

  const handleReset = (key: keyof StorySliders) => {
    onChange({ ...sliders, [key]: 'auto' })
  }

  const renderSlider = (key: keyof StorySliders, compact = false) => {
    const config = SLIDER_CONFIG[key]
    const currentValue = sliders[key]
    const isAuto = currentValue === 'auto'
    const selectedIndex = isAuto ? -1 : ([1, 3, 5] as const).indexOf(currentValue as 1 | 3 | 5)

    return (
      <div
        key={key}
        style={{
          padding: compact ? '0.875rem' : '1.25rem',
          background: 'rgba(26, 39, 68, 0.4)',
          border: '1px solid rgba(250, 246, 237, 0.06)',
          borderRadius: 16,
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s ease',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.875rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              fontWeight: 500,
              color: 'var(--moon-light)',
              fontSize: compact ? '0.875rem' : '0.9375rem',
            }}>
              {config.name}
            </span>
            {isAuto && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.6875rem',
                color: 'var(--amber-warm)',
                background: 'rgba(212, 165, 116, 0.1)',
                padding: '0.125rem 0.5rem',
                borderRadius: 20,
                fontWeight: 500,
                letterSpacing: '0.02em',
              }}>
                <Sparkles style={{ width: 10, height: 10 }} />
                Auto
              </span>
            )}
          </div>
          {!isAuto && (
            <button
              onClick={() => handleReset(key)}
              disabled={disabled}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.75rem',
                color: 'var(--moon-soft)',
                background: 'none',
                border: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: 0.6,
                transition: 'opacity 0.2s',
                padding: '0.25rem 0.5rem',
                marginRight: '-0.5rem',
              }}
              onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.opacity = '1' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6' }}
              title="Reset to auto"
            >
              <RotateCcw style={{ width: 12, height: 12 }} />
              Reset
            </button>
          )}
        </div>

        {/* Segmented control */}
        <div style={{
          display: 'flex',
          background: 'rgba(10, 15, 24, 0.5)',
          borderRadius: 10,
          padding: '0.25rem',
          gap: '0.25rem',
        }}>
          {([1, 3, 5] as const).map((value, index) => {
            const isSelected = currentValue === value
            const label = config.labels[index]

            return (
              <button
                key={value}
                onClick={() => handleSliderChange(key, value)}
                disabled={disabled}
                style={{
                  flex: 1,
                  padding: compact ? '0.5rem 0.25rem' : '0.625rem 0.5rem',
                  borderRadius: 8,
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(212, 165, 116, 0.2) 0%, rgba(232, 196, 154, 0.15) 100%)'
                    : 'transparent',
                  border: 'none',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  position: 'relative',
                  boxShadow: isSelected ? '0 2px 8px rgba(212, 165, 116, 0.15)' : 'none',
                }}
              >
                <div style={{
                  fontSize: compact ? '0.75rem' : '0.8125rem',
                  fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? 'var(--amber-warm)' : 'var(--moon-soft)',
                  transition: 'color 0.15s ease',
                }}>
                  {label}
                </div>
              </button>
            )
          })}
        </div>

        {/* Description - shows for selected value */}
        {!isAuto && selectedIndex >= 0 && (
          <p style={{
            marginTop: '0.625rem',
            fontSize: '0.75rem',
            color: 'var(--moon-soft)',
            opacity: 0.7,
            textAlign: 'center',
            fontStyle: 'italic',
          }}>
            {config.descriptions[currentValue as 1 | 3 | 5]}
          </p>
        )}
      </div>
    )
  }

  const setCount = Object.values(sliders).filter(v => v !== 'auto').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Visible sliders */}
      {VISIBLE_SLIDERS.map(key => renderSlider(key, false))}

      {/* Advanced toggle */}
      <button
        onClick={onToggleAdvanced}
        disabled={disabled}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '0.875rem',
          background: showAdvanced ? 'rgba(26, 39, 68, 0.3)' : 'transparent',
          border: '1px dashed rgba(250, 246, 237, 0.12)',
          borderRadius: 12,
          cursor: disabled ? 'not-allowed' : 'pointer',
          color: 'var(--moon-soft)',
          fontSize: '0.8125rem',
          transition: 'all 0.2s ease',
          opacity: disabled ? 0.5 : 0.8,
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.opacity = '1'
            e.currentTarget.style.borderColor = 'rgba(250, 246, 237, 0.2)'
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = disabled ? '0.5' : '0.8'
          e.currentTarget.style.borderColor = 'rgba(250, 246, 237, 0.12)'
        }}
      >
        {showAdvanced ? (
          <>
            <ChevronUp style={{ width: 16, height: 16 }} />
            Hide advanced options
          </>
        ) : (
          <>
            <ChevronDown style={{ width: 16, height: 16 }} />
            Fine-tune {ADVANCED_SLIDERS.length} more settings
          </>
        )}
      </button>

      {/* Advanced sliders - grid layout */}
      {showAdvanced && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '0.75rem',
          paddingTop: '0.25rem',
        }}>
          {ADVANCED_SLIDERS.map(key => renderSlider(key, true))}
        </div>
      )}

      {/* Summary indicator */}
      {setCount > 0 && (
        <p style={{
          fontSize: '0.75rem',
          color: 'var(--amber-warm)',
          opacity: 0.8,
          textAlign: 'center',
          marginTop: '0.25rem',
        }}>
          {setCount} preference{setCount !== 1 ? 's' : ''} set
        </p>
      )}
    </div>
  )
}
