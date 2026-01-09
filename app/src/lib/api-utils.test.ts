import { describe, it, expect } from 'vitest'
import {
  apiSuccess,
  apiError,
  ApiErrors,
  validateBody,
  isApiError,
} from './api-utils'
import { z } from 'zod'

describe('api-utils', () => {
  describe('apiSuccess', () => {
    it('creates a success response with correct shape', async () => {
      const response = apiSuccess({ id: 1, name: 'Test' })
      const json = await response.json()

      expect(json).toEqual({
        success: true,
        data: { id: 1, name: 'Test' },
      })
      expect(response.status).toBe(200)
    })

    it('allows custom status code', async () => {
      const response = apiSuccess({ created: true }, 201)
      expect(response.status).toBe(201)
    })

    it('preserves nested data structure', async () => {
      const response = apiSuccess({
        preview: {
          title: 'Test Book',
          cast: [{ name: 'Hero', role: 'protagonist' }],
        },
      })
      const json = await response.json()

      expect(json.success).toBe(true)
      expect(json.data.preview.title).toBe('Test Book')
      expect(json.data.preview.cast[0].name).toBe('Hero')
    })
  })

  describe('apiError', () => {
    it('creates an error response with correct shape', async () => {
      const response = apiError('Something went wrong', 500)
      const json = await response.json()

      expect(json).toEqual({
        success: false,
        error: 'Something went wrong',
      })
      expect(response.status).toBe(500)
    })

    it('includes code when provided', async () => {
      const response = apiError('Unauthorized', 401, undefined, 'UNAUTHORIZED')
      const json = await response.json()

      expect(json.code).toBe('UNAUTHORIZED')
    })

    it('includes details when provided', async () => {
      const response = apiError('Validation failed', 400, { field: 'email' }, 'VALIDATION')
      const json = await response.json()

      expect(json.details).toEqual({ field: 'email' })
    })
  })

  describe('ApiErrors convenience methods', () => {
    it('unauthorized returns 401 with correct code', async () => {
      const response = ApiErrors.unauthorized()
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.success).toBe(false)
      expect(json.code).toBe('UNAUTHORIZED')
    })

    it('forbidden returns 403', async () => {
      const response = ApiErrors.forbidden()
      expect(response.status).toBe(403)
    })

    it('notFound returns 404 with resource name', async () => {
      const response = ApiErrors.notFound('Book')
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe('Book not found')
    })

    it('badRequest returns 400 with details', async () => {
      const response = ApiErrors.badRequest('Invalid input', { field: 'name' })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.details).toEqual({ field: 'name' })
    })

    it('rateLimited returns 429', async () => {
      const response = ApiErrors.rateLimited()
      expect(response.status).toBe(429)
    })

    it('internal returns 500', async () => {
      const response = ApiErrors.internal()
      expect(response.status).toBe(500)
    })

    it('validation returns 400 with formatted errors', async () => {
      const errors = [
        { path: ['email'], message: 'Invalid email', code: 'invalid_type' as const, expected: 'string', received: 'undefined' },
        { path: ['name'], message: 'Required', code: 'invalid_type' as const, expected: 'string', received: 'undefined' },
      ]
      const response = ApiErrors.validation(errors)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.code).toBe('VALIDATION_ERROR')
      expect(json.details).toHaveProperty('email')
      expect(json.details).toHaveProperty('name')
    })
  })

  describe('validateBody', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      age: z.number().optional(),
    })

    it('returns parsed data when valid', async () => {
      const request = new Request('http://test.com', {
        method: 'POST',
        body: JSON.stringify({ name: 'John', age: 30 }),
      })

      const result = await validateBody(request, testSchema)

      expect(isApiError(result)).toBe(false)
      if (!isApiError(result)) {
        expect(result.name).toBe('John')
        expect(result.age).toBe(30)
      }
    })

    it('returns error response when validation fails', async () => {
      const request = new Request('http://test.com', {
        method: 'POST',
        body: JSON.stringify({ name: '' }), // Empty string fails min(1)
      })

      const result = await validateBody(request, testSchema)

      expect(isApiError(result)).toBe(true)
    })

    it('returns error response for invalid JSON', async () => {
      const request = new Request('http://test.com', {
        method: 'POST',
        body: 'not json',
      })

      const result = await validateBody(request, testSchema)

      expect(isApiError(result)).toBe(true)
    })
  })

  describe('isApiError', () => {
    it('returns true for NextResponse', async () => {
      const response = apiError('Test error')
      expect(isApiError(response)).toBe(true)
    })

    it('returns false for plain objects', () => {
      expect(isApiError({ name: 'test' })).toBe(false)
      expect(isApiError(null)).toBe(false)
      expect(isApiError(undefined)).toBe(false)
    })
  })
})
