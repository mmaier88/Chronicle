'use client'

import { useEffect } from 'react'
import { initializeNativeApp } from '@/lib/native'

export function NativeInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Initialize native app (handles platform detection internally)
    initializeNativeApp().then(() => {
      // Add platform class to body for platform-specific styling after detection
      // Check if Capacitor is available on window (injected by native shell)
      const capacitor = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } }).Capacitor
      if (capacitor?.isNativePlatform?.()) {
        document.body.classList.add('native-app')
        document.body.classList.add(`platform-${capacitor.getPlatform?.() || 'unknown'}`)
      }
    })

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
