import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') || '/create'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Check if this is a new user and send welcome email
      const { data: { user } } = await supabase.auth.getUser()
      let isNewUser = false

      if (user) {
        const createdAt = new Date(user.created_at)
        const now = new Date()
        isNewUser = (now.getTime() - createdAt.getTime()) < 60000 // Created within last minute

        if (isNewUser && user.email) {
          const name = user.user_metadata?.full_name || user.user_metadata?.name || ''
          sendWelcomeEmail(user.email, name).catch(console.error)
        }
      }

      // New users go straight to story creation
      const finalRedirect = isNewUser ? '/create/new' : redirect
      return NextResponse.redirect(`${origin}${finalRedirect}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
