'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

interface User {
  id: string
  name: string
  color: string
  email?: string
}

interface CollaboratorState {
  user: User
  cursor?: {
    anchor: number
    head: number
  }
  lastActive: number
}

export interface UseCollaborationOptions {
  documentId: string
  user: User
  websocketUrl?: string
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected') => void
}

export interface UseCollaborationReturn {
  ydoc: Y.Doc | null
  provider: WebsocketProvider | null
  collaborators: CollaboratorState[]
  connectionStatus: 'connecting' | 'connected' | 'disconnected'
  isConnected: boolean
}

// Generate a random color for a user
function generateUserColor(seed: string): string {
  const colors = [
    '#f87171', // red
    '#fb923c', // orange
    '#fbbf24', // amber
    '#a3e635', // lime
    '#34d399', // emerald
    '#22d3ee', // cyan
    '#60a5fa', // blue
    '#a78bfa', // violet
    '#f472b6', // pink
  ]

  // Simple hash
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i)
    hash |= 0
  }

  return colors[Math.abs(hash) % colors.length]
}

export function useCollaboration({
  documentId,
  user,
  websocketUrl = 'wss://y-websocket-server.herokuapp.com', // Default public server for demo
  onStatusChange
}: UseCollaborationOptions): UseCollaborationReturn {
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null)
  const [provider, setProvider] = useState<WebsocketProvider | null>(null)
  const [collaborators, setCollaborators] = useState<CollaboratorState[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')

  const providerRef = useRef<WebsocketProvider | null>(null)
  const ydocRef = useRef<Y.Doc | null>(null)

  // Set user color if not provided
  const userWithColor = {
    ...user,
    color: user.color || generateUserColor(user.id)
  }

  useEffect(() => {
    // Create Yjs document
    const doc = new Y.Doc()
    ydocRef.current = doc
    setYdoc(doc)

    // Create WebSocket provider
    const wsProvider = new WebsocketProvider(
      websocketUrl,
      `researchbase-${documentId}`,
      doc,
      {
        connect: true,
        params: {},
        WebSocketPolyfill: undefined,
        maxBackoffTime: 2500,
      }
    )

    providerRef.current = wsProvider
    setProvider(wsProvider)

    // Set up awareness
    const awareness = wsProvider.awareness

    // Set local user state
    awareness.setLocalStateField('user', userWithColor)

    // Connection status handlers
    const handleStatus = (event: { status: string }) => {
      const status = event.status === 'connected' ? 'connected' : 'disconnected'
      setConnectionStatus(status)
      onStatusChange?.(status)
    }

    wsProvider.on('status', handleStatus)

    // Track collaborators through awareness
    const handleAwarenessChange = () => {
      const states = awareness.getStates()
      const collabs: CollaboratorState[] = []

      states.forEach((state: { user?: User; cursor?: { anchor: number; head: number } }, clientId: number) => {
        // Skip if no user info or if it's the local client
        if (!state.user || clientId === awareness.clientID) return

        collabs.push({
          user: state.user,
          cursor: state.cursor,
          lastActive: Date.now()
        })
      })

      setCollaborators(collabs)
    }

    awareness.on('change', handleAwarenessChange)

    // Initial awareness update
    handleAwarenessChange()

    // Cleanup
    return () => {
      wsProvider.off('status', handleStatus)
      awareness.off('change', handleAwarenessChange)
      wsProvider.disconnect()
      wsProvider.destroy()
      doc.destroy()
    }
  }, [documentId, websocketUrl]) // Don't include user to avoid reconnecting on every render

  // Update local user when it changes
  useEffect(() => {
    if (providerRef.current) {
      providerRef.current.awareness.setLocalStateField('user', userWithColor)
    }
  }, [userWithColor.id, userWithColor.name, userWithColor.color])

  return {
    ydoc,
    provider,
    collaborators,
    connectionStatus,
    isConnected: connectionStatus === 'connected'
  }
}
