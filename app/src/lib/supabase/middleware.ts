import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { CURRENT_TERMS_VERSION } from '@/lib/terms'

// Security headers - comprehensive protection
const securityHeaders = {
  // Prevent MIME type sniffing (fixes Content-Type Sniffing Attack)
  'X-Content-Type-Options': 'nosniff',
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  // XSS protection (legacy, but still useful for older browsers)
  'X-XSS-Protection': '1; mode=block',
  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Disable unnecessary browser features
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  // Content Security Policy - adjust as needed for your app
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://api.anthropic.com https://api.elevenlabs.io",
    "frame-src 'self' https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; '),
  // Strict Transport Security (HTTPS only)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  // Prevent DNS prefetching leaks
  'X-DNS-Prefetch-Control': 'off',
  // Prevent IE from executing downloads in site context
  'X-Download-Options': 'noopen',
  // Prevent Adobe products from loading data
  'X-Permitted-Cross-Domain-Policies': 'none',
}

// Paths that require terms acceptance
const termsProtectedPaths = ['/create', '/reader', '/dashboard']

// Paths exempt from terms check (auth flow, legal pages, public pages)
const termsExemptPaths = ['/login', '/signup', '/callback', '/accept-terms', '/legal', '/imprint', '/pricing', '/api', '/share']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Add security headers to all responses
  Object.entries(securityHeaders).forEach(([key, value]) => {
    supabaseResponse.headers.set(key, value)
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes (require auth)
  const protectedPaths = ['/dashboard', '/workspace', '/project', '/document', '/create']
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Check terms acceptance for authenticated users on protected paths
  const isTermsExemptPath = termsExemptPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )
  const needsTermsCheck = termsProtectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (user && needsTermsCheck && !isTermsExemptPath) {
    // Check if user has accepted current terms
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('terms_accepted_at, terms_version')
      .eq('id', user.id)
      .single()

    const needsTermsAcceptance = !profile?.terms_accepted_at ||
      profile.terms_version !== CURRENT_TERMS_VERSION

    if (needsTermsAcceptance) {
      const url = request.nextUrl.clone()
      url.pathname = '/accept-terms'
      return NextResponse.redirect(url)
    }
  }

  // Redirect logged in users away from auth pages
  const authPaths = ['/login', '/signup']
  const isAuthPath = authPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isAuthPath && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/create'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
