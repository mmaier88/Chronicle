import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { generateCorrelationId } from '@/lib/logger'

export async function middleware(request: NextRequest) {
  // Generate correlation ID for request tracing
  const correlationId = request.headers.get('x-correlation-id') || generateCorrelationId()

  // Clone request headers and add correlation ID
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-correlation-id', correlationId)

  // Update the session (auth)
  const response = await updateSession(request)

  // Add correlation ID to response headers for client-side debugging
  response.headers.set('x-correlation-id', correlationId)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
