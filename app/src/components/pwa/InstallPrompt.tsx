'use client'

import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    setIsIOS(iOS && !isStandalone)

    // Listen for the beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // Check if user has dismissed before
      const dismissed = localStorage.getItem('pwa-install-dismissed')
      if (!dismissed) {
        // Show prompt after a delay (let user explore first)
        setTimeout(() => {
          setShowPrompt(true)
        }, 30000) // Show after 30 seconds
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Check if already installed
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed')
      setShowPrompt(false)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      console.log('[PWA] Install prompt outcome:', outcome)
      setDeferredPrompt(null)
      setShowPrompt(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  // Don't show if no prompt available and not iOS
  if (!showPrompt && !isIOS) {
    return null
  }

  // iOS-specific instructions
  if (isIOS) {
    const dismissed = typeof window !== 'undefined' && localStorage.getItem('pwa-install-dismissed-ios')
    if (dismissed) return null

    return (
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '1rem',
          background: 'linear-gradient(to top, rgba(10, 15, 24, 0.98), rgba(10, 15, 24, 0.95))',
          borderTop: '1px solid rgba(212, 165, 116, 0.2)',
          zIndex: 9999,
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(212, 165, 116, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Download style={{ width: 20, height: 20, color: '#d4a574' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#faf6ed', margin: 0 }}>
                  Install Chronicle
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#e8e0d0', opacity: 0.8, margin: 0 }}>
                  Add to your home screen
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.setItem('pwa-install-dismissed-ios', 'true')
                setIsIOS(false)
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#e8e0d0',
                cursor: 'pointer',
                padding: '0.25rem',
                opacity: 0.6,
              }}
            >
              <X style={{ width: 20, height: 20 }} />
            </button>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#e8e0d0', opacity: 0.7, margin: 0 }}>
            Tap <span style={{ color: '#007AFF' }}>Share</span> then <strong>&quot;Add to Home Screen&quot;</strong>
          </p>
        </div>
      </div>
    )
  }

  // Android/Chrome install prompt
  if (!showPrompt) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: '1rem',
        right: '1rem',
        maxWidth: 400,
        margin: '0 auto',
        padding: '1rem 1.25rem',
        background: 'linear-gradient(135deg, rgba(26, 39, 68, 0.98), rgba(20, 30, 48, 0.98))',
        borderRadius: 16,
        border: '1px solid rgba(212, 165, 116, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        zIndex: 9999,
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'rgba(212, 165, 116, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Download style={{ width: 22, height: 22, color: '#d4a574' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, color: '#faf6ed', margin: 0 }}>
              Install Chronicle
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#e8e0d0', opacity: 0.7, margin: 0 }}>
              Quick access from your home screen
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: '#e8e0d0',
            cursor: 'pointer',
            padding: '0.25rem',
            opacity: 0.6,
          }}
        >
          <X style={{ width: 20, height: 20 }} />
        </button>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={handleDismiss}
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            background: 'rgba(250, 246, 237, 0.08)',
            border: '1px solid rgba(250, 246, 237, 0.12)',
            borderRadius: 10,
            color: '#e8e0d0',
            fontSize: '0.9375rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Not now
        </button>
        <button
          onClick={handleInstall}
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            background: 'linear-gradient(135deg, #d4a574, #e8c49a)',
            border: 'none',
            borderRadius: 10,
            color: '#0a0f18',
            fontSize: '0.9375rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Install
        </button>
      </div>
    </div>
  )
}
