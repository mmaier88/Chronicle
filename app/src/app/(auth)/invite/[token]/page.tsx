'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface InvitationData {
  email: string
  role: string
  expires_at: string
  workspace: {
    id: string
    name: string
    slug: string
  }
}

export default function AcceptInvitationPage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string

  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState('')
  const [needsAuth, setNeedsAuth] = useState(false)

  const fetchInvitation = useCallback(async () => {
    try {
      const res = await fetch(`/api/invitations/${token}/accept`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Invalid invitation')
      }

      setInvitation(data.invitation)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invitation')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchInvitation()
  }, [fetchInvitation])

  const handleAccept = async () => {
    setAccepting(true)
    setError('')

    try {
      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
      })

      const data = await res.json()

      if (res.status === 401) {
        // User needs to sign in
        setNeedsAuth(true)
        setAccepting(false)
        return
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept invitation')
      }

      // Redirect to workspace
      router.push(`/workspace/${data.workspace.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation')
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Invalid Invitation
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error}
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (needsAuth) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Sign In Required
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please sign in or create an account to accept this invitation to join{' '}
            <strong>{invitation?.workspace.name}</strong>.
          </p>
          <div className="space-y-3">
            <Link
              href={`/login?redirect=/invite/${token}`}
              className="block w-full px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Sign In
            </Link>
            <Link
              href={`/signup?redirect=/invite/${token}`}
              className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          You&apos;ve Been Invited!
        </h1>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          You&apos;ve been invited to join <strong className="text-gray-900 dark:text-white">{invitation?.workspace.name}</strong> as a{' '}
          <strong className="text-gray-900 dark:text-white capitalize">{invitation?.role}</strong>.
        </p>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {accepting ? 'Joining...' : 'Accept Invitation'}
          </button>
          <Link
            href="/dashboard"
            className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Decline
          </Link>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          This invitation expires on {invitation && new Date(invitation.expires_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}
