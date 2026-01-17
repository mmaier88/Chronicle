/**
 * Security-focused error handling utilities.
 * Prevents information leakage through error messages.
 */

// Patterns that might leak sensitive information
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /credential/i,
  /auth/i,
  /bearer/i,
  /api[_-]?key/i,
  /connection.*string/i,
  /database/i,
  /postgres/i,
  /supabase/i,
  /stripe/i,
  /webhook/i,
  /internal.*error/i,
  /stack.*trace/i,
  /at\s+\w+\s+\(/i, // Stack trace lines
  /\/.*\/.*\.ts/i, // File paths
  /\/.*\/.*\.js/i,
  /node_modules/i,
]

// Safe error messages to return to clients
const SAFE_MESSAGES: Record<string, string> = {
  // Auth errors
  'Invalid login credentials': 'Invalid email or password',
  'Email not confirmed': 'Please check your email to confirm your account',
  'User not found': 'Invalid email or password', // Don't reveal if user exists
  'Invalid email or password': 'Invalid email or password',

  // Rate limiting
  'rate limit': 'Too many requests. Please try again later.',
  'too many requests': 'Too many requests. Please try again later.',

  // Generic
  'internal server error': 'An error occurred. Please try again.',
  'service unavailable': 'Service temporarily unavailable. Please try again.',
  'network error': 'Network error. Please check your connection.',

  // Database
  'duplicate key': 'This record already exists.',
  'foreign key': 'Related record not found.',
  'unique constraint': 'This value is already in use.',
}

/**
 * Check if an error message contains sensitive information.
 */
function containsSensitiveInfo(message: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(message))
}

/**
 * Get a safe version of an error message.
 * Sanitizes any potentially sensitive information.
 */
export function getSafeErrorMessage(
  error: unknown,
  defaultMessage = 'An error occurred. Please try again.'
): string {
  // Get the error message
  let message: string
  if (error instanceof Error) {
    message = error.message
  } else if (typeof error === 'string') {
    message = error
  } else if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    message = error.message
  } else {
    return defaultMessage
  }

  // Check for known safe messages
  const lowerMessage = message.toLowerCase()
  for (const [pattern, safeMessage] of Object.entries(SAFE_MESSAGES)) {
    if (lowerMessage.includes(pattern.toLowerCase())) {
      return safeMessage
    }
  }

  // Check for sensitive patterns
  if (containsSensitiveInfo(message)) {
    return defaultMessage
  }

  // If message is very long, it might contain stack traces
  if (message.length > 200) {
    return defaultMessage
  }

  // Return the original message if it seems safe
  return message
}

/**
 * Create a safe error response for API endpoints.
 */
export function createSafeErrorResponse(
  error: unknown,
  statusCode = 500,
  defaultMessage = 'An error occurred'
): { error: string; status: number } {
  const safeMessage = getSafeErrorMessage(error, defaultMessage)

  // Log the full error server-side for debugging
  if (process.env.NODE_ENV !== 'production') {
    console.error('[safe-error] Original error:', error)
  }

  return {
    error: safeMessage,
    status: statusCode,
  }
}

/**
 * Sanitize an object for logging, removing sensitive fields.
 */
export function sanitizeForLogging(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'cookie',
    'credential',
    'apiKey',
    'api_key',
  ]

  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase()
    if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}
