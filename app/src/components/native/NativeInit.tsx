'use client'

import { useEffect } from 'react'
import { initializeNativeApp, isNative, platform } from '@/lib/native'

export function NativeInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Initialize native app
    initializeNativeApp()

    // Add platform class to body for platform-specific styling
    if (isNative) {
      document.body.classList.add('native-app')
      document.body.classList.add(`platform-${platform}`)
    }

    // Handle app state changes (iOS/Android)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Native] App resumed')
        // Could refresh data here
      } else {
        console.log('[Native] App backgrounded')
        // Could pause audio or save state here
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return null
}
