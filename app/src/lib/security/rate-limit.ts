import { createServiceClient } from '@/lib/supabase/server'

export interface RateLimitResult {
  allowed: boolean
  blocked: boolean
  attempts?: number
  remaining?: number
  blocked_until?: string
  reason?: string
}

export type RateLimitAction = 'login' | 'otp' | 'password_reset' | 'share_validate'

interface RateLimitConfig {
  maxAttempts: number
  windowMinutes: number
  blockMinutes: number
}

const DEFAULT_CONFIGS: Record<RateLimitAction, RateLimitConfig> = {
  login: { maxAttempts: 5, windowMinutes: 15, blockMinutes: 30 },
  otp: { maxAttempts: 5, windowMinutes: 10, blockMinutes: 30 },
  password_reset: { maxAttempts: 3, windowMinutes: 60, blockMinutes: 60 },
  share_validate: { maxAttempts: 10, windowMinutes: 5, blockMinutes: 15 },
}

/**
 * Check if an identifier is rate limited for a specific action.
 * Uses database-backed rate limiting for persistence across serverless invocations.
 */
export async function checkRateLimit(
  identifier: string,
  identifierType: 'email' | 'ip',
  action: RateLimitAction,
  config?: Partial<RateLimitConfig>
): Promise<RateLimitResult> {
  const supabase = createServiceClient()
  const { maxAttempts, windowMinutes, blockMinutes } = {
    ...DEFAULT_CONFIGS[action],
    ...config,
  }

  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_identifier_type: identifierType,
      p_action: action,
      p_max_attempts: maxAttempts,
      p_window_minutes: windowMinutes,
      p_block_minutes: blockMinutes,
    })

    if (error) {
      // On error, allow the request but log it
      console.error('[rate-limit] Error checking rate limit:', error.message)
      return { allowed: true, blocked: false }
    }

    return data as RateLimitResult
  } catch (err) {
    console.error('[rate-limit] Exception:', err)
    return { allowed: true, blocked: false }
  }
}

/**
 * Reset rate limit counter after successful authentication.
 */
export async function resetRateLimit(
  identifier: string,
  identifierType: 'email' | 'ip',
  action: RateLimitAction
): Promise<void> {
  const supabase = createServiceClient()

  try {
    await supabase.rpc('reset_rate_limit', {
      p_identifier: identifier,
      p_identifier_type: identifierType,
      p_action: action,
    })
  } catch (err) {
    console.error('[rate-limit] Error resetting rate limit:', err)
  }
}

/**
 * Extract client IP from request headers.
 * Works with Vercel, Cloudflare, and standard proxies.
 */
export function getClientIP(request: Request): string {
  // Vercel
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  // Cloudflare
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  if (cfConnectingIP) {
    return cfConnectingIP
  }

  // Real IP (nginx)
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  return 'unknown'
}

/**
 * Log a security event to the audit trail.
 */
export async function logSecurityEvent(
  eventType: string,
  eventData: Record<string, unknown> = {},
  options: {
    userId?: string
    ipAddress?: string
    userAgent?: string
  } = {}
): Promise<void> {
  const supabase = createServiceClient()

  try {
    await supabase.rpc('log_security_event', {
      p_event_type: eventType,
      p_event_data: eventData,
      p_user_id: options.userId || null,
      p_ip_address: options.ipAddress || null,
      p_user_agent: options.userAgent || null,
    })
  } catch (err) {
    console.error('[security] Error logging security event:', err)
  }
}
