'use client'

import { useIdentify, useSetDocumentId } from '@veltdev/react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface VeltUser {
  userId: string
  name: string
  email: string
  photoUrl?: string
  organizationId?: string
}

interface UseVeltAuthOptions {
  documentId?: string
  workspaceId?: string
}

export function useVeltAuth({ documentId, workspaceId }: UseVeltAuthOptions = {}) {
  const [veltUser, setVeltUser] = useState<VeltUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Get current user from Supabase and set up Velt identification
  useEffect(() => {
    async function initializeVeltUser() {
      try {
        const supabase = createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
          setVeltUser(null)
          setIsLoading(false)
          return
        }

        const userData: VeltUser = {
          userId: user.id,
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
          email: user.email || '',
          photoUrl: user.user_metadata?.avatar_url,
          organizationId: workspaceId,
        }

        setVeltUser(userData)
        setIsLoading(false)
      } catch (err) {
        console.error('Failed to initialize Velt user:', err)
        setIsLoading(false)
      }
    }

    initializeVeltUser()
  }, [workspaceId])

  // Identify user with Velt
  useIdentify(veltUser)

  // Set document ID for Velt - only call when documentId is provided
  const veltDocId = documentId ? `researchbase-${documentId}` : ''
  useSetDocumentId(veltDocId || 'default')

  return {
    veltUser,
    isLoading,
    isAuthenticated: !!veltUser,
  }
}
