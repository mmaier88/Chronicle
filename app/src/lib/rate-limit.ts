// Simple in-memory rate limiter for API routes
// For production, consider using Redis or Upstash

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap) {
    if (entry.resetAt < now) {
      rateLimitMap.delete(key)
    }
  }
}, 60000) // Clean every minute

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const key = identifier

  let entry = rateLimitMap.get(key)

  // Create new entry or reset if window expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    }
    rateLimitMap.set(key, entry)
  }

  entry.count++

  if (entry.count > config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  }
}

// Pre-configured rate limiters for different endpoints
export const RATE_LIMITS = {
  // AI generation: 20 requests per minute
  aiGenerate: { maxRequests: 20, windowMs: 60000 },
  // TTS: 10 requests per minute
  tts: { maxRequests: 10, windowMs: 60000 },
  // Job creation: 5 per day (handled by existing RPC)
  jobCreate: { maxRequests: 5, windowMs: 86400000 },
  // Cover generation: 5 per minute
  cover: { maxRequests: 5, windowMs: 60000 },
  // Email sending: 10 per hour
  email: { maxRequests: 10, windowMs: 3600000 },
}

// Helper to create rate limit response headers
export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
    ...(result.success ? {} : { 'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)) }),
  }
}
