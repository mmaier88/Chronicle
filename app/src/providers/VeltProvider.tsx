'use client'

import { VeltProvider as VP, VeltComments, VeltCursor, VeltPresence } from '@veltdev/react'
import { ReactNode, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface VeltProviderProps {
  children: ReactNode
}

interface VeltUser {
  userId: string
  organizationId: string
  name: string
  email: string
  photoUrl?: string
}

export function VeltProvider({ children }: VeltProviderProps) {
  const apiKey = process.env.NEXT_PUBLIC_VELT_API_KEY
  const [veltUser, setVeltUser] = useState<VeltUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch user and generate Velt token
  const generateToken = useCallback(async (): Promise<string> => {
    const response = await fetch('/api/velt/token', { method: 'POST' })
    if (!response.ok) {
      throw new Error('Failed to generate Velt token')
    }
    const data = await response.json()

    // Update user state if not set
    if (!veltUser && data.user) {
      setVeltUser(data.user)
    }

    return data.token
  }, [veltUser])

  // Initialize user on mount
  useEffect(() => {
    async function initUser() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          // Fetch token which also returns user data
          const response = await fetch('/api/velt/token', { method: 'POST' })
          if (response.ok) {
            const data = await response.json()
            setVeltUser(data.user)
          }
        }
      } catch (error) {
        console.error('Failed to init Velt user:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initUser()
  }, [])

  if (!apiKey) {
    console.warn('Velt API key not configured')
    return <>{children}</>
  }

  // Show loading state briefly
  if (isLoading) {
    return <>{children}</>
  }

  // If no user, render without Velt auth (for login page etc)
  if (!veltUser) {
    return (
      <VP apiKey={apiKey}>
        {children}
      </VP>
    )
  }

  return (
    <VP
      apiKey={apiKey}
      authProvider={{
        user: veltUser,
        generateToken,
        retryConfig: { retryCount: 3, retryDelay: 1000 },
      }}
    >
      {/* Core collaboration components at root level */}
      <VeltComments textMode={true} />
      <VeltCursor />
      {children}
    </VP>
  )
}
