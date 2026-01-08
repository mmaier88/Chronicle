'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/create'

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError('Please enter your email')
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/callback?redirect=${redirect}`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  const handleOAuthLogin = async (provider: 'google') => {
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/callback?redirect=${redirect}`,
        queryParams: {
          prompt: 'consent select_account',
          access_type: 'offline',
        },
        scopes: 'email profile',
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.875rem 1rem',
    background: 'rgba(250, 246, 237, 0.05)',
    border: '1px solid rgba(250, 246, 237, 0.12)',
    borderRadius: 12,
    color: '#faf6ed',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#e8e0d0',
    marginBottom: '0.5rem',
  }

  const googleButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.875rem 1.5rem',
    background: '#ffffff',
    border: 'none',
    borderRadius: 12,
    color: '#1a1a1a',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    transition: 'transform 0.2s, box-shadow 0.2s',
  }

  const primaryButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.875rem 1.5rem',
    background: 'linear-gradient(135deg, #d4a574 0%, #e8c49a 100%)',
    border: 'none',
    borderRadius: 12,
    color: '#0a0f18',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1,
    transition: 'transform 0.2s, box-shadow 0.2s',
  }

  if (success) {
    return (
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <div style={{ color: '#4ade80', marginBottom: '1rem' }}>
          <svg style={{ width: 48, height: 48, margin: '0 auto' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 style={{ fontSize: '1.25rem', color: '#faf6ed', marginBottom: '0.5rem' }}>Check your email</h2>
        <p style={{ color: '#e8e0d0', opacity: 0.7, fontSize: '0.9375rem' }}>
          We sent a sign-in link to <strong style={{ color: '#d4a574' }}>{email}</strong>
        </p>
      </div>
    )
  }

  return (
    <div style={{ marginTop: '2rem' }}>
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

      {/* Google button first - primary action */}
      <button
        type="button"
        onClick={() => handleOAuthLogin('google')}
        disabled={loading}
        style={googleButtonStyle}
      >
        <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>

      {/* Divider */}
      <div style={{ position: 'relative', margin: '1.5rem 0' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '100%', height: 1, background: 'rgba(250, 246, 237, 0.1)' }} />
        </div>
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
          <span style={{ padding: '0 1rem', background: '#141e30', color: '#e8e0d0', fontSize: '0.875rem', opacity: 0.6 }}>
            or
          </span>
        </div>
      </div>

      {/* Magic link form */}
      <form onSubmit={handleMagicLink}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="email" style={labelStyle}>
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
            placeholder="you@example.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={primaryButtonStyle}
        >
          {loading ? 'Sending...' : 'Send magic link'}
        </button>
      </form>
    </div>
  )
}

export default function LoginPage() {
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
      <div style={{ maxWidth: 400, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
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
          <p style={{
            marginTop: '0.5rem',
            color: '#e8e0d0',
            opacity: 0.7,
            fontSize: '1.0625rem',
          }}>
            Sign in to continue
          </p>
        </div>

        <Suspense fallback={
          <div style={{ textAlign: 'center', color: '#d4a574' }}>Loading...</div>
        }>
          <LoginForm />
        </Suspense>

        <p style={{
          textAlign: 'center',
          marginTop: '2rem',
          fontSize: '0.9375rem',
          color: '#e8e0d0',
          opacity: 0.7,
        }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={{ color: '#d4a574', textDecoration: 'none', fontWeight: 500 }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
