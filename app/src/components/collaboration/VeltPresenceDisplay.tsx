'use client'

import { VeltPresence, VeltCursor, usePresenceUsers } from '@veltdev/react'
import { Users } from 'lucide-react'

interface VeltPresenceDisplayProps {
  showCursors?: boolean
  maxAvatars?: number
}

export function VeltPresenceDisplay({
  showCursors = true,
  maxAvatars = 5
}: VeltPresenceDisplayProps) {
  const presenceUsers = usePresenceUsers()

  return (
    <div className="flex items-center gap-2">
      {/* Online users count */}
      {presenceUsers && presenceUsers.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <Users className="w-3 h-3" />
          <span>{presenceUsers.length} online</span>
        </div>
      )}

      {/* Velt Presence Avatars */}
      <div className="velt-presence-wrapper">
        <VeltPresence
          maxUsers={maxAvatars}
          self={false}
        />
      </div>

      {/* Velt Cursors - real-time cursor tracking */}
      {showCursors && <VeltCursor />}

      <style jsx global>{`
        .velt-presence-wrapper {
          display: flex;
          align-items: center;
        }

        /* Custom styling for Velt presence avatars */
        .velt-presence-wrapper [class*="velt-presence"] {
          display: flex;
          align-items: center;
          gap: -8px;
        }

        .velt-presence-wrapper [class*="velt-avatar"] {
          width: 28px;
          height: 28px;
          border-radius: 9999px;
          border: 2px solid white;
          margin-left: -8px;
        }

        .velt-presence-wrapper [class*="velt-avatar"]:first-child {
          margin-left: 0;
        }

        /* Dark mode support */
        .dark .velt-presence-wrapper [class*="velt-avatar"] {
          border-color: #1f2937;
        }
      `}</style>
    </div>
  )
}
