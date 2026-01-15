import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email'
import { CURRENT_TERMS_VERSION } from '@/lib/terms'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') || '/create'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Check if user has accepted current terms
        const serviceClient = createServiceClient()
        const { data: profile } = await serviceClient
          .from('user_profiles')
          .select('terms_accepted_at, terms_version')
          .eq('id', user.id)
          .single()

        // Determine if this is a new user (created within last minute)
        const createdAt = new Date(user.created_at)
        const now = new Date()
        const isNewUser = (now.getTime() - createdAt.getTime()) < 60000

        // Send welcome email for new users
        if (isNewUser && user.email) {
          const name = user.user_metadata?.full_name || user.user_metadata?.name || ''
          sendWelcomeEmail(user.email, name).catch(console.error)
        }

        // Check if user needs to accept terms
        const needsTermsAcceptance = !profile?.terms_accepted_at ||
          profile.terms_version !== CURRENT_TERMS_VERSION

        if (needsTermsAcceptance) {
          // User needs to accept terms - redirect to accept-terms page
          return NextResponse.redirect(`${origin}/accept-terms`)
        }

        // User has accepted current terms - redirect to intended destination
        const finalRedirect = isNewUser ? '/create/new' : redirect
        return NextResponse.redirect(`${origin}${finalRedirect}`)
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
