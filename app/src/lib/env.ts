/**
 * Environment variable validation
 *
 * Validates required environment variables at startup.
 * Throws an error if critical variables are missing.
 */

interface EnvConfig {
  // Required for the app to function
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  ANTHROPIC_API_KEY: string

  // Optional but recommended
  GOOGLE_API_KEY?: string
  ELEVENLABS_API_KEY?: string
  SENDGRID_API_KEY?: string
  VOYAGE_API_KEY?: string
  NEXT_PUBLIC_APP_URL?: string
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  CRON_SECRET?: string
  SENTRY_DSN?: string
}

const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ANTHROPIC_API_KEY',
] as const

const optionalVars = [
  'GOOGLE_API_KEY',
  'ELEVENLABS_API_KEY',
  'SENDGRID_API_KEY',
  'VOYAGE_API_KEY',
  'NEXT_PUBLIC_APP_URL',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'CRON_SECRET',
  'SENTRY_DSN',
] as const

export function validateEnv(): EnvConfig {
  const missing: string[] = []
  const warnings: string[] = []

  // Check required variables
  for (const key of requiredVars) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  // Check optional variables and warn if missing
  for (const key of optionalVars) {
    if (!process.env[key]) {
      warnings.push(key)
    }
  }

  // Log warnings for missing optional vars
  if (warnings.length > 0 && process.env.NODE_ENV !== 'test') {
    console.warn(
      `[env] Optional environment variables not set: ${warnings.join(', ')}. Some features may be unavailable.`
    )
  }

  // Throw if required vars are missing
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    )
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    VOYAGE_API_KEY: process.env.VOYAGE_API_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
    SENTRY_DSN: process.env.SENTRY_DSN,
  }
}

// Export individual getters for type-safe access
export function getEnv<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
  return process.env[key] as EnvConfig[K]
}

// Check if a specific feature is available based on env vars
export const features = {
  coverGeneration: () => !!process.env.GOOGLE_API_KEY,
  textToSpeech: () => !!process.env.ELEVENLABS_API_KEY,
  email: () => !!process.env.SENDGRID_API_KEY,
  embeddings: () => !!process.env.VOYAGE_API_KEY,
  payments: () => !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET,
  errorTracking: () => !!process.env.SENTRY_DSN,
}
