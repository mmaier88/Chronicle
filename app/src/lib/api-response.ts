import { NextResponse } from 'next/server'

/**
 * Standardized API Response Format
 *
 * Success: { success: true, data: T }
 * Error: { success: false, error: { message: string, code?: string, details?: unknown } }
 */

export interface ApiSuccessResponse<T> {
  success: true
  data: T
}

export interface ApiErrorResponse {
  success: false
  error: {
    message: string
    code?: string
    details?: unknown
  }
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

// Standard error codes
export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

/**
 * Create a success response
 */
export function success<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data }, { status })
}

/**
 * Create an error response
 */
export function error(
  message: string,
  status = 500,
  code?: ErrorCode,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  const errorObj: ApiErrorResponse['error'] = { message }
  if (code) errorObj.code = code
  if (details) errorObj.details = details

  return NextResponse.json(
    {
      success: false,
      error: errorObj,
    },
    { status }
  )
}

// Convenience methods for common errors
export const apiError = {
  unauthorized: (message = 'Unauthorized') =>
    error(message, 401, ErrorCodes.UNAUTHORIZED),

  forbidden: (message = 'Forbidden') =>
    error(message, 403, ErrorCodes.FORBIDDEN),

  notFound: (message = 'Not found') =>
    error(message, 404, ErrorCodes.NOT_FOUND),

  badRequest: (message: string, details?: unknown) =>
    error(message, 400, ErrorCodes.BAD_REQUEST, details),

  rateLimited: (message = 'Rate limit exceeded') =>
    error(message, 429, ErrorCodes.RATE_LIMITED),

  internal: (message = 'Internal server error') =>
    error(message, 500, ErrorCodes.INTERNAL_ERROR),

  validation: (message: string, details?: unknown) =>
    error(message, 400, ErrorCodes.VALIDATION_ERROR, details),
}
