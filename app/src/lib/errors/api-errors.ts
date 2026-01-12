/**
 * Centralized API error handling for external services
 * Provides clear, user-friendly error messages for quota limits, auth issues, etc.
 */

export type ExternalService = 'elevenlabs' | 'anthropic' | 'stripe' | 'supabase' | 'sendgrid'

export interface APIErrorInfo {
  service: ExternalService
  type: 'quota_exceeded' | 'auth_failed' | 'rate_limited' | 'service_unavailable' | 'unknown'
  message: string
  userMessage: string
  actionRequired?: string
  retryAfter?: number
}

/**
 * Parse error response and return structured error info
 */
export function parseAPIError(
  service: ExternalService,
  status: number,
  errorBody: unknown
): APIErrorInfo {
  const body = typeof errorBody === 'string' ? tryParseJSON(errorBody) : errorBody

  // ElevenLabs specific errors
  if (service === 'elevenlabs') {
    return parseElevenLabsError(status, body)
  }

  // Anthropic specific errors
  if (service === 'anthropic') {
    return parseAnthropicError(status, body)
  }

  // Stripe specific errors
  if (service === 'stripe') {
    return parseStripeError(status, body)
  }

  // Generic fallback
  return {
    service,
    type: 'unknown',
    message: `${service} API error: ${status}`,
    userMessage: `Something went wrong with ${service}. Please try again.`,
  }
}

function parseElevenLabsError(status: number, body: unknown): APIErrorInfo {
  const detail = extractNestedValue(body, 'detail') || extractNestedValue(body, 'error')

  // Quota exceeded
  if (status === 401 && typeof detail === 'object' && detail !== null) {
    const detailObj = detail as Record<string, unknown>
    if (detailObj.status === 'quota_exceeded') {
      const remaining = extractNestedValue(detailObj, 'message')?.toString().match(/(\d+) credits remaining/)?.[1]
      return {
        service: 'elevenlabs',
        type: 'quota_exceeded',
        message: `ElevenLabs quota exceeded. ${remaining ? `${remaining} credits remaining.` : ''}`,
        userMessage: 'Audio generation limit reached for this month.',
        actionRequired: 'Upgrade your ElevenLabs plan or wait for quota reset.',
      }
    }
  }

  // Auth failed
  if (status === 401) {
    return {
      service: 'elevenlabs',
      type: 'auth_failed',
      message: 'ElevenLabs authentication failed',
      userMessage: 'Audio service is not configured correctly.',
      actionRequired: 'Check ELEVENLABS_API_KEY environment variable.',
    }
  }

  // Rate limited
  if (status === 429) {
    return {
      service: 'elevenlabs',
      type: 'rate_limited',
      message: 'ElevenLabs rate limit hit',
      userMessage: 'Too many audio requests. Please wait a moment.',
      retryAfter: 30,
    }
  }

  return {
    service: 'elevenlabs',
    type: 'unknown',
    message: `ElevenLabs error: ${status} - ${JSON.stringify(body)}`,
    userMessage: 'Audio generation failed. Please try again.',
  }
}

function parseAnthropicError(status: number, body: unknown): APIErrorInfo {
  const errorType = extractNestedValue(body, 'error', 'type')
  const message = extractNestedValue(body, 'error', 'message')

  // Rate limited
  if (status === 429 || errorType === 'rate_limit_error') {
    return {
      service: 'anthropic',
      type: 'rate_limited',
      message: `Anthropic rate limited: ${message}`,
      userMessage: 'Story generation is temporarily busy. Please wait a moment.',
      retryAfter: 60,
    }
  }

  // Quota/billing
  if (errorType === 'invalid_request_error' && typeof message === 'string' && message.includes('credit')) {
    return {
      service: 'anthropic',
      type: 'quota_exceeded',
      message: `Anthropic credits exhausted: ${message}`,
      userMessage: 'Story generation limit reached.',
      actionRequired: 'Add credits to your Anthropic account.',
    }
  }

  // Auth
  if (status === 401) {
    return {
      service: 'anthropic',
      type: 'auth_failed',
      message: 'Anthropic authentication failed',
      userMessage: 'Story generation service is not configured correctly.',
      actionRequired: 'Check ANTHROPIC_API_KEY environment variable.',
    }
  }

  return {
    service: 'anthropic',
    type: 'unknown',
    message: `Anthropic error: ${status} - ${message || JSON.stringify(body)}`,
    userMessage: 'Story generation failed. Please try again.',
  }
}

function parseStripeError(status: number, body: unknown): APIErrorInfo {
  const code = extractNestedValue(body, 'error', 'code')
  const message = extractNestedValue(body, 'error', 'message')

  // Card declined
  if (code === 'card_declined') {
    return {
      service: 'stripe',
      type: 'unknown',
      message: `Card declined: ${message}`,
      userMessage: 'Your card was declined. Please try a different payment method.',
    }
  }

  // Auth
  if (status === 401) {
    return {
      service: 'stripe',
      type: 'auth_failed',
      message: 'Stripe authentication failed',
      userMessage: 'Payment service is not configured correctly.',
      actionRequired: 'Check Stripe API keys.',
    }
  }

  return {
    service: 'stripe',
    type: 'unknown',
    message: `Stripe error: ${status} - ${message || JSON.stringify(body)}`,
    userMessage: 'Payment failed. Please try again.',
  }
}

// Helper to extract nested values safely
function extractNestedValue(obj: unknown, ...keys: string[]): unknown {
  let current: unknown = obj
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

function tryParseJSON(str: string): unknown {
  try {
    return JSON.parse(str)
  } catch {
    return str
  }
}

/**
 * Format error for logging (includes all details)
 */
export function formatErrorForLog(error: APIErrorInfo): string {
  return `[${error.service.toUpperCase()}] ${error.type}: ${error.message}${error.actionRequired ? ` | Action: ${error.actionRequired}` : ''}`
}

/**
 * Get user-facing notification content
 */
export function getErrorNotification(error: APIErrorInfo): {
  title: string
  message: string
  type: 'error' | 'warning'
} {
  const titles: Record<APIErrorInfo['type'], string> = {
    quota_exceeded: 'Limit Reached',
    auth_failed: 'Configuration Error',
    rate_limited: 'Please Wait',
    service_unavailable: 'Service Unavailable',
    unknown: 'Error',
  }

  return {
    title: titles[error.type],
    message: error.userMessage + (error.actionRequired ? ` ${error.actionRequired}` : ''),
    type: error.type === 'rate_limited' ? 'warning' : 'error',
  }
}
