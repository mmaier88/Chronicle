import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  checkRateLimit,
  getClientIP,
  logSecurityEvent,
  getSafeErrorMessage,
} from '@/lib/security'

/**
 * Rate-limited OTP (magic link) endpoint.
 * Fixes: Login Rate Limiting, OTP Brute Force Vulnerability
 */
export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request)
  const userAgent = request.headers.get('user-agent') || 'unknown'

  try {
    const { email, redirectTo } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Normalize email for consistent rate limiting
    const normalizedEmail = email.toLowerCase().trim()

    // Check rate limit by email
    const emailRateLimit = await checkRateLimit(normalizedEmail, 'email', 'otp')
    if (!emailRateLimit.allowed) {
      await logSecurityEvent('otp_rate_limited', {
        email: normalizedEmail,
        reason: 'email_limit',
      }, {
        ipAddress: clientIP,
        userAgent,
      })

      return NextResponse.json(
        {
          error: emailRateLimit.reason || 'Too many attempts. Please try again later.',
          retryAfter: emailRateLimit.blocked_until,
        },
        { status: 429 }
      )
    }

    // Check rate limit by IP
    const ipRateLimit = await checkRateLimit(clientIP, 'ip', 'otp', {
      maxAttempts: 10, // More lenient for IP (shared IPs)
      windowMinutes: 10,
      blockMinutes: 15,
    })
    if (!ipRateLimit.allowed) {
      await logSecurityEvent('otp_rate_limited', {
        email: normalizedEmail,
        reason: 'ip_limit',
      }, {
        ipAddress: clientIP,
        userAgent,
      })

      return NextResponse.json(
        {
          error: ipRateLimit.reason || 'Too many attempts. Please try again later.',
          retryAfter: ipRateLimit.blocked_until,
        },
        { status: 429 }
      )
    }

    // Send OTP
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: redirectTo || `${request.nextUrl.origin}/callback`,
      },
    })

    if (error) {
      // Log failed attempt
      await logSecurityEvent('otp_failed', {
        email: normalizedEmail,
        error: error.message,
      }, {
        ipAddress: clientIP,
        userAgent,
      })

      // Return safe error message (don't reveal if email exists)
      return NextResponse.json(
        { error: getSafeErrorMessage(error, 'Failed to send login link') },
        { status: 400 }
      )
    }

    // Log successful OTP send
    await logSecurityEvent('otp_sent', {
      email: normalizedEmail,
    }, {
      ipAddress: clientIP,
      userAgent,
    })

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account exists, a login link has been sent.',
    })
  } catch (err) {
    console.error('[auth/otp] Error:', err)
    return NextResponse.json(
      { error: getSafeErrorMessage(err, 'An error occurred') },
      { status: 500 }
    )
  }
}
