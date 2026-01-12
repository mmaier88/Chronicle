/**
 * Native Capabilities
 *
 * Provides access to native device features via Capacitor.
 * Falls back gracefully when running in browser.
 */

import { Capacitor } from '@capacitor/core'

// Check if running in native app
export const isNative = Capacitor.isNativePlatform()
export const platform = Capacitor.getPlatform() // 'ios' | 'android' | 'web'

/**
 * Initialize native app
 * Call this once on app startup
 */
export async function initializeNativeApp() {
  if (!isNative) return

  try {
    // Initialize splash screen
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()

    // Configure status bar
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Dark })
    if (platform === 'android') {
      await StatusBar.setBackgroundColor({ color: '#0a0f18' })
    }

    // Initialize keyboard handling
    const { Keyboard } = await import('@capacitor/keyboard')
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-open')
    })
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-open')
    })

    console.log('[Native] App initialized on', platform)
  } catch (error) {
    console.error('[Native] Initialization error:', error)
  }
}

/**
 * Request push notification permissions
 */
export async function requestPushPermission(): Promise<boolean> {
  if (!isNative) return false

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    const result = await PushNotifications.requestPermissions()
    if (result.receive === 'granted') {
      await PushNotifications.register()
      return true
    }
    return false
  } catch (error) {
    console.error('[Native] Push permission error:', error)
    return false
  }
}

/**
 * Show local notification
 */
export async function showLocalNotification(
  title: string,
  body: string,
  data?: Record<string, string>
) {
  if (!isNative) {
    // Fall back to web notifications
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body })
    }
    return
  }

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: Date.now(),
          extra: data,
        },
      ],
    })
  } catch (error) {
    console.error('[Native] Notification error:', error)
  }
}

/**
 * Trigger haptic feedback
 */
export async function hapticFeedback(type: 'light' | 'medium' | 'heavy' = 'medium') {
  if (!isNative) return

  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    const style = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    }[type]
    await Haptics.impact({ style })
  } catch (error) {
    // Haptics may not be available on all devices
  }
}

/**
 * Share content using native share sheet
 */
export async function shareContent(options: {
  title: string
  text?: string
  url?: string
}): Promise<boolean> {
  try {
    const { Share } = await import('@capacitor/share')
    await Share.share(options)
    return true
  } catch (error) {
    // Fall back to clipboard copy
    if (options.url && navigator.clipboard) {
      await navigator.clipboard.writeText(options.url)
      return true
    }
    return false
  }
}

/**
 * Save file to device (for audio downloads)
 */
export async function saveFile(
  data: Blob,
  filename: string,
  directory: 'Documents' | 'Cache' = 'Documents'
): Promise<string | null> {
  if (!isNative) {
    // Web fallback: trigger download
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return filename
  }

  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem')

    // Convert blob to base64
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        resolve(result.split(',')[1])
      }
      reader.readAsDataURL(data)
    })

    const dir = directory === 'Documents' ? Directory.Documents : Directory.Cache

    const result = await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: dir,
    })

    return result.uri
  } catch (error) {
    console.error('[Native] Save file error:', error)
    return null
  }
}

/**
 * Check if file exists (for cached audio)
 */
export async function fileExists(
  filename: string,
  directory: 'Documents' | 'Cache' = 'Cache'
): Promise<boolean> {
  if (!isNative) return false

  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem')
    const dir = directory === 'Documents' ? Directory.Documents : Directory.Cache

    await Filesystem.stat({
      path: filename,
      directory: dir,
    })
    return true
  } catch {
    return false
  }
}

/**
 * Read file from device
 */
export async function readFile(
  filename: string,
  directory: 'Documents' | 'Cache' = 'Cache'
): Promise<string | null> {
  if (!isNative) return null

  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem')
    const dir = directory === 'Documents' ? Directory.Documents : Directory.Cache

    const result = await Filesystem.readFile({
      path: filename,
      directory: dir,
    })

    return result.data as string
  } catch {
    return null
  }
}

/**
 * Delete file from device
 */
export async function deleteFile(
  filename: string,
  directory: 'Documents' | 'Cache' = 'Cache'
): Promise<boolean> {
  if (!isNative) return false

  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem')
    const dir = directory === 'Documents' ? Directory.Documents : Directory.Cache

    await Filesystem.deleteFile({
      path: filename,
      directory: dir,
    })
    return true
  } catch {
    return false
  }
}
