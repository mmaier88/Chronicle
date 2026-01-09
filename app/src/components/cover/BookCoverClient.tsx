'use client'

import { useState, useEffect, useCallback } from 'react'
import { BookCover } from './BookCover'

interface BookCoverClientProps {
  bookId: string
  initialCoverUrl?: string | null
  initialStatus?: 'pending' | 'generating' | 'ready' | 'failed' | null
  title: string
  size?: 'sm' | 'md' | 'lg'
}

export function BookCoverClient({
  bookId,
  initialCoverUrl,
  initialStatus,
  title,
  size = 'md',
}: BookCoverClientProps) {
  const [coverUrl, setCoverUrl] = useState(initialCoverUrl)
  const [status, setStatus] = useState(initialStatus)

  const pollCoverStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/cover/${bookId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setStatus(data.data.status)
          if (data.data.cover_url) {
            setCoverUrl(data.data.cover_url)
          }
        }
      }
    } catch {
      // Silently ignore polling errors
    }
  }, [bookId])

  useEffect(() => {
    // Poll for cover status if generating
    if (status === 'generating') {
      const interval = setInterval(pollCoverStatus, 3000) // Poll every 3 seconds
      return () => clearInterval(interval)
    }
  }, [status, pollCoverStatus])

  return (
    <BookCover
      coverUrl={coverUrl}
      title={title}
      status={status}
      size={size}
    />
  )
}
