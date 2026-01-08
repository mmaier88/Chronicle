import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { validateEnv, getEnv, features } from './env'

describe('env', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('validateEnv', () => {
    it('throws when required vars are missing', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = undefined
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = undefined
      process.env.SUPABASE_SERVICE_ROLE_KEY = undefined
      process.env.ANTHROPIC_API_KEY = undefined

      expect(() => validateEnv()).toThrow('Missing required environment variables')
    })

    it('returns config when all required vars are set', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
      process.env.NODE_ENV = 'test' // Suppress warnings

      const config = validateEnv()

      expect(config.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co')
      expect(config.ANTHROPIC_API_KEY).toBe('test-anthropic-key')
    })
  })

  describe('getEnv', () => {
    it('returns env var value', () => {
      process.env.ANTHROPIC_API_KEY = 'my-key'
      expect(getEnv('ANTHROPIC_API_KEY')).toBe('my-key')
    })
  })

  describe('features', () => {
    it('returns false when GOOGLE_API_KEY is not set', () => {
      process.env.GOOGLE_API_KEY = undefined
      expect(features.coverGeneration()).toBe(false)
    })

    it('returns true when GOOGLE_API_KEY is set', () => {
      process.env.GOOGLE_API_KEY = 'some-key'
      expect(features.coverGeneration()).toBe(true)
    })

    it('returns false when ELEVENLABS_API_KEY is not set', () => {
      process.env.ELEVENLABS_API_KEY = undefined
      expect(features.textToSpeech()).toBe(false)
    })

    it('returns true when ELEVENLABS_API_KEY is set', () => {
      process.env.ELEVENLABS_API_KEY = 'some-key'
      expect(features.textToSpeech()).toBe(true)
    })
  })
})
