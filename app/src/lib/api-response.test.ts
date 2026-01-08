import { describe, it, expect } from 'vitest'
import { success, error, apiError, ErrorCodes } from './api-response'

describe('api-response', () => {
  describe('success', () => {
    it('creates a success response with data', async () => {
      const response = success({ id: 1, name: 'Test' })
      const json = await response.json()

      expect(json).toEqual({
        success: true,
        data: { id: 1, name: 'Test' },
      })
      expect(response.status).toBe(200)
    })

    it('allows custom status code', async () => {
      const response = success({ created: true }, 201)
      expect(response.status).toBe(201)
    })
  })

  describe('error', () => {
    it('creates an error response with message', async () => {
      const response = error('Something went wrong', 500)
      const json = await response.json()

      expect(json).toEqual({
        success: false,
        error: { message: 'Something went wrong' },
      })
      expect(response.status).toBe(500)
    })

    it('includes error code when provided', async () => {
      const response = error('Unauthorized', 401, ErrorCodes.UNAUTHORIZED)
      const json = await response.json()

      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('includes details when provided', async () => {
      const response = error('Validation failed', 400, ErrorCodes.VALIDATION_ERROR, {
        field: 'email',
        reason: 'invalid format',
      })
      const json = await response.json()

      expect(json.error.details).toEqual({
        field: 'email',
        reason: 'invalid format',
      })
    })
  })

  describe('apiError convenience methods', () => {
    it('unauthorized returns 401', async () => {
      const response = apiError.unauthorized()
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('forbidden returns 403', async () => {
      const response = apiError.forbidden()
      expect(response.status).toBe(403)
    })

    it('notFound returns 404', async () => {
      const response = apiError.notFound()
      expect(response.status).toBe(404)
    })

    it('badRequest returns 400 with details', async () => {
      const response = apiError.badRequest('Invalid input', { field: 'name' })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error.details).toEqual({ field: 'name' })
    })

    it('rateLimited returns 429', async () => {
      const response = apiError.rateLimited()
      expect(response.status).toBe(429)
    })

    it('internal returns 500', async () => {
      const response = apiError.internal()
      expect(response.status).toBe(500)
    })
  })
})
