/**
 * Next.js Instrumentation
 *
 * This file runs once when the server starts.
 * Used for validating environment variables and other startup checks.
 */

export async function register() {
  // Only run on server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('./lib/env')

    try {
      validateEnv()
      console.log('[env] Environment validation passed')
    } catch (error) {
      console.error('[env] Environment validation failed:', error)
      // In production, we might want to exit
      if (process.env.NODE_ENV === 'production') {
        process.exit(1)
      }
    }
  }
}
