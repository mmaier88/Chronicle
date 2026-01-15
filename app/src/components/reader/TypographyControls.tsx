'use client'

import { Type, Sun, Moon, Sunrise, Star, Minus, Plus, X, AlignLeft, AlignJustify } from 'lucide-react'
import type { TypographySettings, ReaderTheme, ReaderFont, ReaderMargins } from '@/lib/reader'
import { THEME_COLORS } from '@/lib/reader'

interface TypographyControlsProps {
  settings: TypographySettings
  onChange: (settings: Partial<TypographySettings>) => void
  onClose: () => void
}

/**
 * Typography Controls
 *
 * Overlay panel for adjusting reader typography settings.
 * Changes are persisted to server immediately.
 */
export function TypographyControls({ settings, onChange, onClose }: TypographyControlsProps) {
  // Font size controls
  const decreaseFontSize = () => {
    if (settings.font_size > 12) {
      onChange({ font_size: settings.font_size - 1 })
    }
  }

  const increaseFontSize = () => {
    if (settings.font_size < 32) {
      onChange({ font_size: settings.font_size + 1 })
    }
  }

  // Line height controls
  const decreaseLineHeight = () => {
    if (settings.line_height > 1.0) {
      onChange({ line_height: Math.round((settings.line_height - 0.1) * 10) / 10 })
    }
  }

  const increaseLineHeight = () => {
    if (settings.line_height < 2.5) {
      onChange({ line_height: Math.round((settings.line_height + 0.1) * 10) / 10 })
    }
  }

  // Theme configuration with icons
  const themeConfig: Record<ReaderTheme, { icon: typeof Sun; label: string }> = {
    light: { icon: Sun, label: 'Light' },
    sepia: { icon: Sunrise, label: 'Sepia' },
    dark: { icon: Moon, label: 'Dark' },
    midnight: { icon: Star, label: 'Midnight' },
  }

  // Margin configuration
  const marginConfig: Record<ReaderMargins, { label: string }> = {
    narrow: { label: 'Narrow' },
    normal: { label: 'Normal' },
    wide: { label: 'Wide' },
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'rgba(15, 23, 42, 0.98)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(250, 246, 237, 0.1)',
      padding: '1.5rem',
      zIndex: 100,
      animation: 'slideUp 0.2s ease-out',
    }}>
      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        maxWidth: 400,
        margin: '0 auto 1.5rem',
      }}>
        <h3 style={{
          fontSize: '0.875rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          opacity: 0.7,
        }}>
          Reading Settings
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--moon-soft)',
            cursor: 'pointer',
            padding: '0.5rem',
            opacity: 0.7,
          }}
        >
          <X size={20} />
        </button>
      </div>

      <div style={{ maxWidth: 400, margin: '0 auto' }}>
        {/* Font Size */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            opacity: 0.6,
            marginBottom: '0.75rem',
          }}>
            Font Size
          </label>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <button
              onClick={decreaseFontSize}
              disabled={settings.font_size <= 12}
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                border: '1px solid rgba(250, 246, 237, 0.2)',
                background: 'rgba(250, 246, 237, 0.05)',
                color: 'var(--moon-light)',
                cursor: settings.font_size <= 12 ? 'not-allowed' : 'pointer',
                opacity: settings.font_size <= 12 ? 0.4 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Minus size={18} />
            </button>
            <div style={{
              flex: 1,
              textAlign: 'center',
              fontSize: '1.125rem',
              fontWeight: 500,
            }}>
              {settings.font_size}pt
            </div>
            <button
              onClick={increaseFontSize}
              disabled={settings.font_size >= 32}
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                border: '1px solid rgba(250, 246, 237, 0.2)',
                background: 'rgba(250, 246, 237, 0.05)',
                color: 'var(--moon-light)',
                cursor: settings.font_size >= 32 ? 'not-allowed' : 'pointer',
                opacity: settings.font_size >= 32 ? 0.4 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Line Height */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            opacity: 0.6,
            marginBottom: '0.75rem',
          }}>
            Line Spacing
          </label>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <button
              onClick={decreaseLineHeight}
              disabled={settings.line_height <= 1.0}
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                border: '1px solid rgba(250, 246, 237, 0.2)',
                background: 'rgba(250, 246, 237, 0.05)',
                color: 'var(--moon-light)',
                cursor: settings.line_height <= 1.0 ? 'not-allowed' : 'pointer',
                opacity: settings.line_height <= 1.0 ? 0.4 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Minus size={18} />
            </button>
            <div style={{
              flex: 1,
              textAlign: 'center',
              fontSize: '1.125rem',
              fontWeight: 500,
            }}>
              {settings.line_height.toFixed(1)}
            </div>
            <button
              onClick={increaseLineHeight}
              disabled={settings.line_height >= 2.5}
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                border: '1px solid rgba(250, 246, 237, 0.2)',
                background: 'rgba(250, 246, 237, 0.05)',
                color: 'var(--moon-light)',
                cursor: settings.line_height >= 2.5 ? 'not-allowed' : 'pointer',
                opacity: settings.line_height >= 2.5 ? 0.4 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Font Family */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            opacity: 0.6,
            marginBottom: '0.75rem',
          }}>
            Font
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem',
          }}>
            {(['serif', 'sans'] as ReaderFont[]).map((font) => (
              <button
                key={font}
                onClick={() => onChange({ font_family: font })}
                style={{
                  padding: '0.75rem',
                  borderRadius: 8,
                  border: settings.font_family === font
                    ? '2px solid var(--amber-warm)'
                    : '1px solid rgba(250, 246, 237, 0.2)',
                  background: settings.font_family === font
                    ? 'rgba(212, 165, 116, 0.15)'
                    : 'rgba(250, 246, 237, 0.05)',
                  color: 'var(--moon-light)',
                  cursor: 'pointer',
                  fontFamily: font === 'serif'
                    ? 'Georgia, Times New Roman, serif'
                    : '-apple-system, BlinkMacSystemFont, sans-serif',
                  fontSize: '1rem',
                }}
              >
                {font === 'serif' ? 'Serif' : 'Sans Serif'}
              </button>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            opacity: 0.6,
            marginBottom: '0.75rem',
          }}>
            Theme
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            gap: '0.5rem',
          }}>
            {(Object.keys(themeConfig) as ReaderTheme[]).map((theme) => {
              const config = themeConfig[theme]
              const colors = THEME_COLORS[theme]
              const Icon = config.icon
              return (
                <button
                  key={theme}
                  onClick={() => onChange({ theme })}
                  style={{
                    padding: '0.75rem 0.5rem',
                    borderRadius: 8,
                    border: settings.theme === theme
                      ? '2px solid var(--amber-warm)'
                      : '1px solid rgba(250, 246, 237, 0.2)',
                    background: colors.bg,
                    color: colors.text,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.7rem',
                  }}
                >
                  <Icon size={16} />
                  {config.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Margins */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            opacity: 0.6,
            marginBottom: '0.75rem',
          }}>
            Margins
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '0.5rem',
          }}>
            {(Object.keys(marginConfig) as ReaderMargins[]).map((margin) => {
              const config = marginConfig[margin]
              return (
                <button
                  key={margin}
                  onClick={() => onChange({ margins: margin })}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 8,
                    border: settings.margins === margin
                      ? '2px solid var(--amber-warm)'
                      : '1px solid rgba(250, 246, 237, 0.2)',
                    background: settings.margins === margin
                      ? 'rgba(212, 165, 116, 0.15)'
                      : 'rgba(250, 246, 237, 0.05)',
                    color: 'var(--moon-light)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >
                  {config.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Justify */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            opacity: 0.6,
            marginBottom: '0.75rem',
          }}>
            Text Alignment
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem',
          }}>
            <button
              onClick={() => onChange({ justify: false })}
              style={{
                padding: '0.75rem',
                borderRadius: 8,
                border: !settings.justify
                  ? '2px solid var(--amber-warm)'
                  : '1px solid rgba(250, 246, 237, 0.2)',
                background: !settings.justify
                  ? 'rgba(212, 165, 116, 0.15)'
                  : 'rgba(250, 246, 237, 0.05)',
                color: 'var(--moon-light)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
              }}
            >
              <AlignLeft size={16} />
              Left
            </button>
            <button
              onClick={() => onChange({ justify: true })}
              style={{
                padding: '0.75rem',
                borderRadius: 8,
                border: settings.justify
                  ? '2px solid var(--amber-warm)'
                  : '1px solid rgba(250, 246, 237, 0.2)',
                background: settings.justify
                  ? 'rgba(212, 165, 116, 0.15)'
                  : 'rgba(250, 246, 237, 0.05)',
                color: 'var(--moon-light)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
              }}
            >
              <AlignJustify size={16} />
              Justify
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Typography Button (trigger for controls)
 */
interface TypographyButtonProps {
  onClick: () => void
}

export function TypographyButton({ onClick }: TypographyButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        border: 'none',
        background: 'rgba(250, 246, 237, 0.1)',
        color: 'var(--moon-light)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background-color 0.2s',
      }}
      title="Reading settings"
    >
      <Type size={20} />
    </button>
  )
}
