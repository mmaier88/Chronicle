/**
 * Environment Variable Validation Tests
 *
 * These tests ensure environment variables are properly formatted
 * and don't contain trailing newlines or other invisible characters
 * that cause authentication failures.
 */

import { describe, it, expect } from 'vitest'

describe('Environment Variable Validation', () => {
  describe('CRITICAL: Secret environment variables must not have whitespace', () => {
    const secretEnvVars = [
      'CRON_SECRET',
      'SUPABASE_SERVICE_ROLE_KEY',
      'ANTHROPIC_API_KEY',
      'SENDGRID_API_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
    ]

    secretEnvVars.forEach(envVar => {
      it(`${envVar} should not have leading/trailing whitespace`, () => {
        const value = process.env[envVar]
        if (value) {
          expect(value).toBe(value.trim())
          expect(value).not.toMatch(/^\s/)
          expect(value).not.toMatch(/\s$/)
          expect(value).not.toMatch(/\\n/)
          expect(value).not.toContain('\n')
          expect(value).not.toContain('\r')
        }
      })
    })
  })

  describe('CRITICAL: CRON_SECRET specifically', () => {
    it('CRON_SECRET must be set in production-like environments', () => {
      // This test will be skipped in dev if CRON_SECRET isn't set
      // But it documents the requirement
      if (process.env.NODE_ENV === 'production' || process.env.CRON_SECRET) {
        expect(process.env.CRON_SECRET).toBeDefined()
        expect(process.env.CRON_SECRET!.length).toBeGreaterThan(0)
      }
    })

    it('CRON_SECRET should be a hex string of reasonable length', () => {
      const secret = process.env.CRON_SECRET?.trim()
      if (secret) {
        // Should be hex characters only
        expect(secret).toMatch(/^[a-f0-9]+$/i)
        // Should be at least 32 characters (128 bits)
        expect(secret.length).toBeGreaterThanOrEqual(32)
      }
    })
  })
})

/**
 * Helper function to validate environment secrets at runtime
 * Call this during app initialization to catch issues early
 */
export function validateSecretEnvVars(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  const secretVars = [
    'CRON_SECRET',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]

  for (const varName of secretVars) {
    const value = process.env[varName]
    if (value) {
      if (value !== value.trim()) {
        errors.push(`${varName} has leading/trailing whitespace`)
      }
      if (value.includes('\n') || value.includes('\\n')) {
        errors.push(`${varName} contains newline characters`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
