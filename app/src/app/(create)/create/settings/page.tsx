'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, LogOut, User, ChevronLeft, Trash2, AlertTriangle } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email: string } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    // Fetch current user info
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user)
        }
      })
      .catch(console.error)
  }, [])

  const handleSignOut = async () => {
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = '/api/auth/signout'
    document.body.appendChild(form)
    form.submit()
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return

    setIsDeleting(true)
    try {
      const res = await fetch('/api/user/delete', { method: 'DELETE' })
      if (res.ok) {
        // Redirect to landing page after deletion
        window.location.href = '/'
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete account')
      }
    } catch (err) {
      console.error('Failed to delete account:', err)
      alert('Failed to delete account. Please try again.')
    } finally {
      setIsDeleting(false)
    }
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

      {/* Danger Zone */}
      <section className="app-card" style={{ marginBottom: '1.5rem', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
        <h2 className="app-label" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444' }}>
          <AlertTriangle style={{ width: 16, height: 16 }} />
          Danger Zone
        </h2>

        {!showDeleteConfirm ? (
          <>
            <p className="app-body-sm" style={{ opacity: 0.7, marginBottom: '1rem' }}>
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                borderRadius: 8,
                background: 'transparent',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
                width: '100%',
                justifyContent: 'center',
              }}
            >
              <Trash2 style={{ width: 16, height: 16 }} />
              Delete Account
            </button>
          </>
        ) : (
          <>
            <p className="app-body-sm" style={{ color: '#fda4af', marginBottom: '1rem' }}>
              This will permanently delete:
            </p>
            <ul style={{
              fontSize: '0.8125rem',
              color: '#e8e0d0',
              opacity: 0.8,
              marginBottom: '1rem',
              paddingLeft: '1.25rem',
            }}>
              <li>All your books and stories</li>
              <li>All generated audio</li>
              <li>Reading progress and preferences</li>
              <li>Your account and profile</li>
            </ul>
            <p className="app-body-sm" style={{ marginBottom: '0.5rem' }}>
              Type <strong style={{ color: '#ef4444' }}>DELETE</strong> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 8,
                background: 'rgba(250, 246, 237, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#faf6ed',
                fontSize: '0.875rem',
                marginBottom: '1rem',
              }}
            />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteConfirmText('')
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  borderRadius: 8,
                  background: 'rgba(250, 246, 237, 0.05)',
                  color: '#e8e0d0',
                  border: '1px solid rgba(250, 246, 237, 0.12)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  borderRadius: 8,
                  background: deleteConfirmText === 'DELETE' ? '#ef4444' : 'rgba(239, 68, 68, 0.3)',
                  color: '#fff',
                  border: 'none',
                  cursor: deleteConfirmText === 'DELETE' && !isDeleting ? 'pointer' : 'not-allowed',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  opacity: deleteConfirmText === 'DELETE' ? 1 : 0.5,
                }}
              >
                {isDeleting ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </>
        )}
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
