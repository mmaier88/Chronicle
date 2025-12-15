/**
 * @deprecated This component is deprecated and will be removed in a future version.
 * Use Velt SDK's VeltPresence component instead for real-time collaboration.
 * The Yjs WebSocket server will be shut down.
 */
'use client'

interface Collaborator {
  user: {
    id: string
    name: string
    color: string
    email?: string
  }
  lastActive: number
}

interface CollaboratorPresenceProps {
  collaborators: Collaborator[]
  connectionStatus: 'connecting' | 'connected' | 'disconnected'
  maxVisible?: number
}

export function CollaboratorPresence({
  collaborators,
  connectionStatus,
  maxVisible = 5
}: CollaboratorPresenceProps) {
  const visibleCollaborators = collaborators.slice(0, maxVisible)
  const hiddenCount = Math.max(0, collaborators.length - maxVisible)

  return (
    <div className="flex items-center gap-2">
      {/* Connection Status */}
      <div className="flex items-center gap-1.5">
        <div
          className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected'
              ? 'bg-green-500'
              : connectionStatus === 'connecting'
              ? 'bg-yellow-500 animate-pulse'
              : 'bg-red-500'
          }`}
        />
        <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
          {connectionStatus === 'connected'
            ? 'Live'
            : connectionStatus === 'connecting'
            ? 'Connecting...'
            : 'Offline'}
        </span>
      </div>

      {/* Collaborator Avatars */}
      {collaborators.length > 0 && (
        <>
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

          <div className="flex items-center -space-x-2">
            {visibleCollaborators.map((collab) => (
              <div
                key={collab.user.id}
                className="relative group"
                title={collab.user.name}
              >
                {/* Avatar */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium ring-2 ring-white dark:ring-gray-800"
                  style={{ backgroundColor: collab.user.color }}
                >
                  {collab.user.name.charAt(0).toUpperCase()}
                </div>

                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {collab.user.name}
                  {collab.user.email && (
                    <span className="text-gray-400 ml-1">({collab.user.email})</span>
                  )}
                </div>
              </div>
            ))}

            {/* Hidden count */}
            {hiddenCount > 0 && (
              <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300 ring-2 ring-white dark:ring-gray-800">
                +{hiddenCount}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
