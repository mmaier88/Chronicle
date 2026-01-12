import type { CapacitorConfig } from '@capacitor/cli'

// For Next.js apps, we load from the server rather than bundled static files
// This allows us to use server components, API routes, etc.
const isProduction = process.env.NODE_ENV === 'production'
const serverUrl = isProduction
  ? 'https://chronicle.town'
  : 'http://localhost:3000'

const config: CapacitorConfig = {
  appId: 'town.chronicle.app',
  appName: 'Chronicle',
  // For Next.js, we don't bundle static files - we load from server
  // webDir is only used for fallback/placeholder
  webDir: 'public',
  server: {
    // Load app from the web server (enables all Next.js features)
    url: serverUrl,
    cleartext: !isProduction, // Allow HTTP in dev
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0a0f18',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0f18',
    },
    Keyboard: {
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#d4a574',
      sound: 'default',
    },
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'Chronicle',
    // Enable background audio
    backgroundColor: '#0a0f18',
  },
  android: {
    backgroundColor: '#0a0f18',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
}

export default config
