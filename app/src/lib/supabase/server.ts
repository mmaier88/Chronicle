import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Dev mode: use this UUID when no user is logged in
export const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'

// Check at runtime, not build time
function isDevMode() {
  // Always skip auth for now during testing
  return true
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Service role client that bypasses RLS - use for dev mode
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Helper to get user or dev user
export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    return { user, isDevUser: false }
  }

  if (isDevMode()) {
    return {
      user: { id: DEV_USER_ID, email: 'dev@chronicle.local' } as { id: string; email: string },
      isDevUser: true
    }
  }

  return { user: null, isDevUser: false }
}
