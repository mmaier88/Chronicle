'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'

type PaymentStatus = 'checking' | 'completed' | 'pending' | 'failed'

function PaymentSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const [status, setStatus] = useState<PaymentStatus>('checking')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setStatus('failed')
      setError('No session ID provided')
      return
    }

    let attempts = 0
    const maxAttempts = 30 // 60 seconds max

    const checkPayment = async () => {
      try {
        const response = await fetch(`/api/payments/${sessionId}`)
        const data = await response.json()

        if (!response.ok) {
          setStatus('failed')
          setError(data.error?.message || 'Failed to verify payment')
          return
        }

        if (data.data.status === 'completed' && data.data.job_id) {
          setStatus('completed')
          // Clear the draft
          localStorage.removeItem('vibe_draft')
          // Redirect to generation page after brief success message
          setTimeout(() => {
            router.push(`/create/generating/${data.data.job_id}`)
          }, 1500)
        } else if (data.data.status === 'pending') {
          setStatus('pending')
          attempts++
          if (attempts < maxAttempts) {
            // Webhook hasn't processed yet, retry
            setTimeout(checkPayment, 2000)
          } else {
            setStatus('failed')
            setError('Payment verification timed out. Your payment was received - please contact support.')
          }
        } else if (data.data.status === 'failed') {
          setStatus('failed')
          setError(data.data.error || 'Payment processing failed')
        } else {
          setStatus('failed')
          setError('Unexpected payment status')
        }
      } catch {
        setStatus('failed')
        setError('Could not verify payment status')
      }
    }

    checkPayment()
  }, [sessionId, router])

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', paddingTop: '4rem' }}>
      {/* Icon */}
      <div style={{ marginBottom: '2rem' }}>
        {status === 'checking' || status === 'pending' ? (
          <div style={{
            width: 80,
            height: 80,
            margin: '0 auto',
            background: 'rgba(212, 165, 116, 0.15)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Loader2 style={{
              width: 40,
              height: 40,
              color: 'var(--amber-warm)',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        ) : status === 'completed' ? (
          <div style={{
            width: 80,
            height: 80,
            margin: '0 auto',
            background: 'rgba(34, 197, 94, 0.15)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <CheckCircle style={{ width: 40, height: 40, color: '#22c55e' }} />
          </div>
        ) : (
          <div style={{
            width: 80,
            height: 80,
            margin: '0 auto',
            background: 'rgba(244, 63, 94, 0.15)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <AlertCircle style={{ width: 40, height: 40, color: '#f43f5e' }} />
          </div>
        )}
      </div>

      {/* Title */}
      <h1 className="app-heading-1" style={{ marginBottom: '0.75rem' }}>
        {status === 'checking' && 'Verifying payment...'}
        {status === 'pending' && 'Processing your order...'}
        {status === 'completed' && 'Payment successful!'}
        {status === 'failed' && 'Something went wrong'}
      </h1>

      {/* Description */}
      <p className="app-body" style={{ marginBottom: '2rem', opacity: 0.7 }}>
        {status === 'checking' && 'Just a moment while we confirm everything.'}
        {status === 'pending' && 'Setting up your book generation. This takes a few seconds.'}
        {status === 'completed' && 'Your story is being crafted. Redirecting you now...'}
        {status === 'failed' && (error || 'Please try again or contact support.')}
      </p>

      {/* Actions for failed state */}
      {status === 'failed' && (
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => router.push('/create/preview')}
            className="app-button-secondary"
          >
            Try again
          </button>
          <a
            href="mailto:hello@chronicle.town"
            className="app-button-secondary"
            style={{ textDecoration: 'none' }}
          >
            Contact support
          </a>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <Loader2 style={{ width: 24, height: 24, animation: 'spin 1s linear infinite', color: 'var(--amber-warm)' }} />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}
