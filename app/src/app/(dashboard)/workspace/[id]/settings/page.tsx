'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface Member {
  user_id: string
  role: 'owner' | 'admin' | 'editor' | 'reviewer' | 'viewer'
  invited_at: string
  joined_at: string
  display_name?: string
  avatar_url?: string
  email?: string
}

interface Invitation {
  id: string
  email: string
  role: string
  created_at: string
  expires_at: string
}

interface Workspace {
  id: string
  name: string
  description?: string
  slug: string
  owner_id: string
}

export default function WorkspaceSettingsPage() {
  const router = useRouter()
  const params = useParams()
  const workspaceId = params.id as string

  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [userRole, setUserRole] = useState<string>('viewer')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Edit workspace state
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [saving, setSaving] = useState(false)

  // Invite dialog state
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<string>('editor')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')

  const fetchWorkspaceData = useCallback(async () => {
    try {
      // Fetch workspace details
      const wsRes = await fetch(`/api/workspaces/${workspaceId}`)
      if (!wsRes.ok) {
        if (wsRes.status === 404) {
          router.push('/dashboard')
          return
        }
        throw new Error('Failed to fetch workspace')
      }
      const wsData = await wsRes.json()
      setWorkspace(wsData.workspace)
      setUserRole(wsData.role)
      setEditName(wsData.workspace.name)
      setEditDescription(wsData.workspace.description || '')

      // Fetch members
      const membersRes = await fetch(`/api/workspaces/${workspaceId}/members`)
      if (membersRes.ok) {
        const membersData = await membersRes.json()
        setMembers(membersData.members)
      }

      // Fetch invitations
      const invitesRes = await fetch(`/api/workspaces/${workspaceId}/invitations`)
      if (invitesRes.ok) {
        const invitesData = await invitesRes.json()
        setInvitations(invitesData.invitations)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspace')
    } finally {
      setLoading(false)
    }
  }, [workspaceId, router])

  useEffect(() => {
    fetchWorkspaceData()
  }, [fetchWorkspaceData])

  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, description: editDescription }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update workspace')
      }

      const data = await res.json()
      setWorkspace(data.workspace)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteError('')
    setInviteSuccess('')
    setInviting(true)

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invitation')
      }

      setInviteSuccess(`Invitation sent to ${inviteEmail}`)
      setInviteEmail('')
      setInvitations([data.invitation, ...invitations])

      // Close dialog after a moment
      setTimeout(() => {
        setShowInviteDialog(false)
        setInviteSuccess('')
      }, 2000)
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to invite')
    } finally {
      setInviting(false)
    }
  }

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!confirm('Revoke this invitation?')) return

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invitations?invitation_id=${invitationId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to revoke invitation')
      }

      setInvitations(invitations.filter(i => i.id !== invitationId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke')
    }
  }

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, role: newRole }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update role')
      }

      setMembers(members.map(m =>
        m.user_id === userId ? { ...m, role: newRole as Member['role'] } : m
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role')
    }
  }

  const handleRemoveMember = async (userId: string, displayName?: string) => {
    if (!confirm(`Remove ${displayName || 'this member'} from the workspace?`)) return

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members?user_id=${userId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to remove member')
      }

      setMembers(members.filter(m => m.user_id !== userId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member')
    }
  }

  const isAdmin = ['owner', 'admin'].includes(userRole)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Workspace not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/dashboard" className="hover:text-gray-700 dark:hover:text-gray-200">
          Dashboard
        </Link>
        <span>/</span>
        <Link href={`/workspace/${workspaceId}`} className="hover:text-gray-700 dark:hover:text-gray-200">
          {workspace.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-white">Settings</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Workspace Settings
      </h1>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* General Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          General
        </h2>

        <form onSubmit={handleSaveWorkspace} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Workspace Name
            </label>
            <input
              type="text"
              id="name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              disabled={!isAdmin}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              disabled={!isAdmin}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50"
            />
          </div>

          {isAdmin && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Members Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Members ({members.length})
          </h2>
          {isAdmin && (
            <button
              onClick={() => setShowInviteDialog(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Invite Member
            </button>
          )}
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {members.map((member) => (
            <div key={member.user_id} className="py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                      {(member.display_name || member.email || 'U')[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {member.display_name || member.email || 'Unknown User'}
                  </div>
                  {member.email && member.display_name && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {member.email}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isAdmin && member.role !== 'owner' ? (
                  <select
                    value={member.role}
                    onChange={(e) => handleUpdateRole(member.user_id, e.target.value)}
                    className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="viewer">Viewer</option>
                  </select>
                ) : (
                  <span className="text-sm text-gray-500 dark:text-gray-400 capitalize px-3 py-1.5">
                    {member.role}
                  </span>
                )}

                {isAdmin && member.role !== 'owner' && (
                  <button
                    onClick={() => handleRemoveMember(member.user_id, member.display_name)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    title="Remove member"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invitations */}
      {isAdmin && invitations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Pending Invitations ({invitations.length})
          </h2>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="py-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {invitation.email}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Invited as {invitation.role} - Expires {new Date(invitation.expires_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleRevokeInvitation(invitation.id)}
                  className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Dialog */}
      {showInviteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Invite Team Member
              </h3>
              <button
                onClick={() => {
                  setShowInviteDialog(false)
                  setInviteError('')
                  setInviteSuccess('')
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleInvite} className="p-4 space-y-4">
              {inviteError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                  {inviteError}
                </div>
              )}

              {inviteSuccess && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 text-sm">
                  {inviteSuccess}
                </div>
              )}

              <div>
                <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="invite-email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="colleague@example.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role
                </label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="admin">Admin - Full access, can manage members</option>
                  <option value="editor">Editor - Can edit documents and sources</option>
                  <option value="reviewer">Reviewer - Can comment and suggest changes</option>
                  <option value="viewer">Viewer - Read-only access</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteDialog(false)
                    setInviteError('')
                    setInviteSuccess('')
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail.trim()}
                  className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
