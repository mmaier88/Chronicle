import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  // Get the origin from the request to redirect back to the correct domain
  const origin = request.headers.get('origin') || request.nextUrl.origin

  return NextResponse.redirect(new URL('/', origin), {
    status: 302,
  })
}
