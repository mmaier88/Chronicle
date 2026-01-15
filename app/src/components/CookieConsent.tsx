'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const COOKIE_CONSENT_KEY = 'chronicle_cookie_consent'

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Check if user has already consented
    const hasConsented = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!hasConsented) {
      // Small delay to not block initial render
      const timer = setTimeout(() => setShowBanner(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true')
    setShowBanner(false)
  }

  const handleDismiss = () => {
    // Dismissing also counts as accepting essential cookies
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true')
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '1rem',
        background: 'rgba(10, 15, 24, 0.95)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid rgba(212, 165, 116, 0.2)',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 280 }}>
          <p
            style={{
              color: '#e8e0d0',
              fontSize: '0.875rem',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            We use essential cookies to make Chronicle work. We do not use tracking or advertising cookies.{' '}
            <a
              href="/legal#privacy"
              style={{ color: '#d4a574', textDecoration: 'underline' }}
            >
              Learn more
            </a>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={handleAccept}
            style={{
              padding: '0.625rem 1.25rem',
              background: 'linear-gradient(135deg, #d4a574 0%, #e8c49a 100%)',
              border: 'none',
              borderRadius: 8,
              color: '#0a0f18',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Got it
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            style={{
              padding: '0.5rem',
              background: 'transparent',
              border: 'none',
              color: '#e8e0d0',
              cursor: 'pointer',
              opacity: 0.6,
            }}
          >
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default CookieConsent
