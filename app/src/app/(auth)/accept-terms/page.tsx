'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CURRENT_TERMS_VERSION } from '@/lib/terms'
import Link from 'next/link'

export default function AcceptTermsPage() {
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!accepted) {
      setError('Please accept the terms to continue')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Update user profile with terms acceptance
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          terms_accepted_at: new Date().toISOString(),
          terms_version: CURRENT_TERMS_VERSION,
        })
        .eq('id', user.id)

      if (updateError) {
        // If profile doesn't exist, create it
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            terms_accepted_at: new Date().toISOString(),
            terms_version: CURRENT_TERMS_VERSION,
          })

        if (insertError) {
          console.error('Failed to save terms acceptance:', insertError)
          setError('Failed to save. Please try again.')
          setLoading(false)
          return
        }
      }

      // Redirect to create page
      router.push('/create/new')
    } catch (err) {
      console.error('Terms acceptance error:', err)
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(180deg, #141e30 0%, #0a0f18 100%)',
      padding: '1.5rem',
      fontFamily: "'Source Sans 3', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <div style={{ maxWidth: 440, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: '2.5rem',
              fontWeight: 500,
              color: '#faf6ed',
              letterSpacing: '0.02em',
            }}>
              Chronicle
            </h1>
          </Link>
        </div>

        <div style={{
          background: 'rgba(250, 246, 237, 0.03)',
          border: '1px solid rgba(250, 246, 237, 0.08)',
          borderRadius: 16,
          padding: '2rem',
        }}>
          <h2 style={{
            fontSize: '1.375rem',
            fontWeight: 500,
            color: '#faf6ed',
            marginBottom: '0.75rem',
            textAlign: 'center',
          }}>
            Before you continue
          </h2>

          <p style={{
            color: '#e8e0d0',
            opacity: 0.7,
            fontSize: '0.9375rem',
            lineHeight: 1.6,
            textAlign: 'center',
            marginBottom: '1.5rem',
          }}>
            Please review and accept our Terms of Service and Privacy Policy.
          </p>

          {error && (
            <div style={{
              padding: '0.875rem 1rem',
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 12,
              color: '#fda4af',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              cursor: 'pointer',
              marginBottom: '1.5rem',
            }}>
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                style={{
                  width: 20,
                  height: 20,
                  marginTop: 2,
                  accentColor: '#d4a574',
                  cursor: 'pointer',
                }}
              />
              <span style={{
                fontSize: '0.9375rem',
                color: '#e8e0d0',
                lineHeight: 1.5,
              }}>
                I agree to the{' '}
                <a
                  href="/legal"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#d4a574', textDecoration: 'underline' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  Terms of Service
                </a>
                {' '}and{' '}
                <a
                  href="/legal#privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#d4a574', textDecoration: 'underline' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  Privacy Policy
                </a>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !accepted}
              style={{
                width: '100%',
                padding: '0.875rem 1.5rem',
                background: accepted
                  ? 'linear-gradient(135deg, #d4a574 0%, #e8c49a 100%)'
                  : 'rgba(250, 246, 237, 0.1)',
                border: 'none',
                borderRadius: 12,
                color: accepted ? '#0a0f18' : '#e8e0d0',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: loading || !accepted ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'Saving...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
