'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, LogOut, Volume2, User, ChevronLeft, Check } from 'lucide-react'
import { BOOK_VOICES, DEFAULT_VOICE_ID } from '@/lib/elevenlabs/client'

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email: string } | null>(null)
  const [selectedVoice, setSelectedVoice] = useState(DEFAULT_VOICE_ID)
  const [isSaving, setIsSaving] = useState(false)
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    // Fetch current user info and preferences
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user)
        }
        if (data.preferences?.voice_id) {
          setSelectedVoice(data.preferences.voice_id)
        }
      })
      .catch(console.error)
  }, [])

  const handleVoiceChange = async (voiceId: string) => {
    setSelectedVoice(voiceId)
    setIsSaving(true)

    try {
      const res = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_id: voiceId }),
      })

      if (res.ok) {
        setShowSaved(true)
        setTimeout(() => setShowSaved(false), 2000)
      }
    } catch (err) {
      console.error('Failed to save preference:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSignOut = async () => {
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = '/api/auth/signout'
    document.body.appendChild(form)
    form.submit()
  }

  return (
    <div style={{ maxWidth: 600 }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => router.back()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            background: 'none',
            border: 'none',
            color: 'var(--amber-warm)',
            cursor: 'pointer',
            padding: 0,
            marginBottom: '1rem',
            fontSize: '0.875rem',
          }}
        >
          <ChevronLeft style={{ width: 16, height: 16 }} />
          Back
        </button>
        <h1 className="app-heading-1" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Settings style={{ width: 28, height: 28, color: 'var(--amber-warm)' }} />
          Settings
        </h1>
      </div>

      {/* Account Section */}
      <section className="app-card" style={{ marginBottom: '1.5rem' }}>
        <h2 className="app-label" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User style={{ width: 16, height: 16 }} />
          Account
        </h2>

        <div style={{ marginBottom: '1.5rem' }}>
          <label className="app-body-sm" style={{ opacity: 0.7, marginBottom: '0.25rem', display: 'block' }}>
            Email
          </label>
          <p className="app-body" style={{ fontWeight: 500 }}>
            {user?.email || 'Loading...'}
          </p>
        </div>

        <button
          onClick={handleSignOut}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
            width: '100%',
            justifyContent: 'center',
          }}
        >
          <LogOut style={{ width: 16, height: 16 }} />
          Sign Out
        </button>
      </section>

      {/* Audio Section */}
      <section className="app-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 className="app-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Volume2 style={{ width: 16, height: 16 }} />
            Audio Narration
          </h2>
          {showSaved && (
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              color: '#22c55e',
              fontSize: '0.75rem',
            }}>
              <Check style={{ width: 14, height: 14 }} />
              Saved
            </span>
          )}
        </div>

        <p className="app-body-sm" style={{ opacity: 0.7, marginBottom: '1rem' }}>
          Choose the voice for your story narrations. This will apply to all new audio playback.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {BOOK_VOICES.map((voice) => (
            <button
              key={voice.id}
              onClick={() => handleVoiceChange(voice.id)}
              disabled={isSaving}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                borderRadius: 12,
                background: selectedVoice === voice.id
                  ? 'rgba(212, 165, 116, 0.15)'
                  : 'rgba(26, 39, 68, 0.3)',
                border: selectedVoice === voice.id
                  ? '2px solid var(--amber-warm)'
                  : '2px solid transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
              }}
            >
              <div>
                <div style={{
                  fontWeight: 600,
                  color: 'var(--moon-soft)',
                  marginBottom: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  {voice.name}
                  <span style={{
                    fontSize: '0.6875rem',
                    padding: '0.125rem 0.5rem',
                    borderRadius: 4,
                    background: voice.gender === 'male'
                      ? 'rgba(59, 130, 246, 0.2)'
                      : 'rgba(236, 72, 153, 0.2)',
                    color: voice.gender === 'male'
                      ? '#60a5fa'
                      : '#f472b6',
                    textTransform: 'uppercase',
                    fontWeight: 500,
                  }}>
                    {voice.gender}
                  </span>
                </div>
                <div style={{ fontSize: '0.8125rem', opacity: 0.7 }}>
                  {voice.description}
                </div>
              </div>
              {selectedVoice === voice.id && (
                <Check style={{ width: 20, height: 20, color: 'var(--amber-warm)', flexShrink: 0 }} />
              )}
            </button>
          ))}
        </div>
      </section>

      {/* App Info */}
      <section className="app-card" style={{ opacity: 0.7 }}>
        <p className="app-body-sm" style={{ textAlign: 'center' }}>
          Chronicle &middot; Stories made for you
        </p>
      </section>
    </div>
  )
}
