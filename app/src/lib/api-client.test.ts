import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { api } from './api-client'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('api-client', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('api.create.preview', () => {
    it('returns typed data on success', async () => {
      const mockPreview = {
        title: 'Test Book',
        logline: 'A test story',
        blurb: 'This is a test blurb',
        cast: [{ name: 'Hero', tagline: 'The protagonist' }],
        setting: 'A test world',
        promise: ['Adventure', 'Drama', 'Excitement'],
        warnings: { violence: 'low', romance: 'none' },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { preview: mockPreview },
        }),
      })

      const result = await api.create.preview({
        genre: 'literary_fiction',
        prompt: 'A test prompt for a story',
      })

      expect(result.error).toBeNull()
      expect(result.data).not.toBeNull()
      expect(result.data?.preview.title).toBe('Test Book')
      expect(result.data?.preview.logline).toBe('A test story')
    })

    it('returns error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Rate limit exceeded',
          code: 'RATE_LIMITED',
        }),
      })

      const result = await api.create.preview({
        genre: 'literary_fiction',
        prompt: 'A test prompt',
      })

      expect(result.data).toBeNull()
      expect(result.error).toBe('Rate limit exceeded')
      expect(result.code).toBe('RATE_LIMITED')
    })

    it('handles network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await api.create.preview({
        genre: 'literary_fiction',
        prompt: 'A test prompt',
      })

      expect(result.data).toBeNull()
      expect(result.error).toBe('Network error')
    })

    it('sends correct request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { preview: { title: 'Test' } },
        }),
      })

      await api.create.preview({
        genre: 'literary_fiction',
        prompt: 'My story idea',
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/create/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genre: 'literary_fiction',
          prompt: 'My story idea',
        }),
      })
    })
  })

  describe('api.create.job', () => {
    it('returns job_id and book_id on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            job_id: 'job-123',
            book_id: 'book-456',
          },
        }),
      })

      const result = await api.create.job({
        genre: 'literary_fiction',
        prompt: 'Test prompt',
        preview: {
          title: 'Test',
          logline: 'Test logline',
          blurb: 'Test blurb',
          cast: [],
          setting: 'Test setting',
          promise: [],
        },
        length: 30,
        mode: 'draft',
      })

      expect(result.error).toBeNull()
      expect(result.data?.job_id).toBe('job-123')
      expect(result.data?.book_id).toBe('book-456')
    })
  })

  describe('api.create.jobStatus', () => {
    it('returns status on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            status: 'running',
            phase: 'writing',
            progress: 50,
          },
        }),
      })

      const result = await api.create.jobStatus('job-123')

      expect(result.error).toBeNull()
      expect(result.data?.status).toBe('running')
      expect(result.data?.progress).toBe(50)
    })

    it('uses GET method without body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { status: 'completed' },
        }),
      })

      await api.create.jobStatus('job-123')

      expect(mockFetch).toHaveBeenCalledWith('/api/create/job/job-123/status', {
        method: 'GET',
        headers: undefined,
        body: undefined,
      })
    })
  })

  describe('api.create.surprise', () => {
    it('returns a prompt on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { prompt: 'A mysterious stranger arrives...' },
        }),
      })

      const result = await api.create.surprise()

      expect(result.error).toBeNull()
      expect(result.data?.prompt).toBe('A mysterious stranger arrives...')
    })
  })

  describe('api.share.create', () => {
    it('returns share token and URL on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            token: 'share-token-abc',
            share_url: 'https://chronicle.town/share/share-token-abc',
            expires_at: '2026-02-01T00:00:00Z',
          },
        }),
      })

      const result = await api.share.create({ bookId: 'book-123' })

      expect(result.error).toBeNull()
      expect(result.data?.token).toBe('share-token-abc')
      expect(result.data?.share_url).toContain('share-token-abc')
    })
  })

  describe('api.cover.generate', () => {
    it('returns cover URL on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            status: 'ready',
            cover_url: 'https://storage.example.com/cover.png',
          },
        }),
      })

      const result = await api.cover.generate({ bookId: 'book-123' })

      expect(result.error).toBeNull()
      expect(result.data?.status).toBe('ready')
      expect(result.data?.cover_url).toBeTruthy()
    })

    it('handles generating status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            status: 'generating',
            message: 'Cover generation in progress',
          },
        }),
      })

      const result = await api.cover.generate({ bookId: 'book-123' })

      expect(result.error).toBeNull()
      expect(result.data?.status).toBe('generating')
    })
  })
})
