'use client'

import { useState, useRef, useEffect } from 'react'
import { Tablet, Loader2, Info, X } from 'lucide-react'

// Lazy load EPUB module
const loadEPUB = () => import('@/lib/export/epub').then(m => m.generateEPUB)

interface Chapter {
  title: string
  sections: {
    title: string
    content_text: string | null
  }[]
}

interface SendToKindleButtonProps {
  book: {
    title: string
    cover_url?: string | null
  }
  chapters: Chapter[]
}

// Detect mobile platform
function getMobilePlatform(): 'ios' | 'android' | null {
  if (typeof navigator === 'undefined') return null
  const ua = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  if (/android/.test(ua)) return 'android'
  return null
}

// Check if Web Share API is available
function canShare(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare
}

export function SendToKindleButton({ book, chapters }: SendToKindleButtonProps) {
  const [isSending, setIsSending] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const infoRef = useRef<HTMLDivElement>(null)
  const platform = getMobilePlatform()

  // Close info popup on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(event.target as Node)) {
        setShowInfo(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSendToKindle = async () => {
    setIsSending(true)

    try {
      // Generate EPUB
      const generateEPUB = await loadEPUB()
      const options = {
        title: book.title,
        coverUrl: book.cover_url,
        chapters: chapters.map((ch) => ({
          title: ch.title,
          sections: ch.sections.map((s) => ({
            title: s.title,
            content: s.content_text || '',
          })),
        })),
      }

      const blob = await generateEPUB(options)
      const filename = `${sanitizeFilename(book.title)}.epub`

      // On mobile with share capability, use native share sheet
      if (platform && canShare()) {
        const file = new File([blob], filename, { type: 'application/epub+zip' })

        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: book.title,
              text: `Read "${book.title}" on Kindle`,
            })
            return // Success via share sheet
          } catch (err) {
            // User cancelled or share failed, fall back to download
            if ((err as Error).name !== 'AbortError') {
              console.error('Share failed:', err)
            }
          }
        }
      }

      // Desktop or fallback: Download file and open Send to Kindle
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.type = 'application/epub+zip'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Open Send to Kindle in new tab (desktop only)
      if (!platform) {
        setTimeout(() => {
          window.open('https://www.amazon.com/sendtokindle', '_blank', 'noopener,noreferrer')
        }, 500)
      }
    } catch (err) {
      console.error('Send to Kindle failed:', err)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div style={{ position: 'relative' }} ref={infoRef}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          onClick={handleSendToKindle}
          disabled={isSending}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'rgba(250, 246, 237, 0.05)',
            border: '1px solid rgba(250, 246, 237, 0.15)',
            borderRadius: 8,
            color: 'var(--moon-soft)',
            fontSize: '0.875rem',
            cursor: isSending ? 'wait' : 'pointer',
            transition: 'all 0.2s',
            opacity: isSending ? 0.7 : 1,
          }}
        >
          {isSending ? (
            <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
          ) : (
            <Tablet style={{ width: 16, height: 16 }} />
          )}
          {isSending ? 'Preparing...' : 'Send to Kindle'}
        </button>

        <button
          onClick={() => setShowInfo(!showInfo)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            padding: 0,
            background: 'transparent',
            border: 'none',
            borderRadius: '50%',
            color: 'var(--moon-soft)',
            cursor: 'pointer',
            opacity: 0.5,
            transition: 'opacity 0.2s',
          }}
          title="How this works"
        >
          <Info style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {/* Info popup */}
      {showInfo && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            minWidth: 280,
            maxWidth: 320,
            background: 'rgba(20, 30, 48, 0.98)',
            border: '1px solid rgba(250, 246, 237, 0.15)',
            borderRadius: 12,
            padding: '1rem',
            zIndex: 50,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--moon-light)' }}>
              How it works
            </h4>
            <button
              onClick={() => setShowInfo(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--moon-soft)',
                cursor: 'pointer',
                padding: 0,
                opacity: 0.6,
              }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {platform === 'ios' || platform === 'android' ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--moon-soft)', lineHeight: 1.5 }}>
              <p style={{ margin: '0 0 0.5rem 0' }}>
                <strong>1.</strong> Tap the button to open Share sheet
              </p>
              <p style={{ margin: '0 0 0.5rem 0' }}>
                <strong>2.</strong> Select <strong>Kindle</strong> from the apps
              </p>
              <p style={{ margin: 0 }}>
                <strong>3.</strong> Your book will appear in your Kindle library
              </p>
            </div>
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--moon-soft)', lineHeight: 1.5 }}>
              <p style={{ margin: '0 0 0.5rem 0' }}>
                <strong>1.</strong> Click to download your EPUB file
              </p>
              <p style={{ margin: '0 0 0.5rem 0' }}>
                <strong>2.</strong> Amazon&apos;s Send to Kindle page will open
              </p>
              <p style={{ margin: 0 }}>
                <strong>3.</strong> Upload your file to send to Kindle
              </p>
            </div>
          )}

          <div
            style={{
              marginTop: '0.75rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid rgba(250, 246, 237, 0.1)',
              fontSize: '0.7rem',
              color: 'var(--moon-soft)',
              opacity: 0.7,
              lineHeight: 1.4,
            }}
          >
            <strong>Privacy:</strong> Your book is generated locally and sent directly to Amazon.
            Chronicle does not store or transmit your files. You own your content.
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        button:hover {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  )
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-z0-9\s-]/gi, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 100)
}
