import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { isStripeConfigured } from '@/lib/stripe/client'
import { getPrice } from '@/lib/stripe/pricing'

export async function GET(request: NextRequest) {
  // Only allow on staging or with secret header
  const isStaging = request.headers.get('host')?.includes('staging')
  const hasSecret = request.headers.get('x-debug-secret') === process.env.CRON_SECRET

  if (!isStaging && !hasSecret) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  const { user } = await getUser()

  // Check env vars (don't expose actual values)
  const envCheck = {
    STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
    STRIPE_SECRET_KEY_PREFIX: process.env.STRIPE_SECRET_KEY?.substring(0, 10),
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30),
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    isStripeConfigured: isStripeConfigured(),
  }

  // Check pricing
  const priceCheck = {
    masterwork_30: getPrice('masterwork', 30),
    masterwork_60: getPrice('masterwork', 60),
    standard_60: getPrice('standard', 60),
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    user: user ? { id: user.id, email: user.email } : null,
    env: envCheck,
    pricing: {
      masterwork_30_priceId: priceCheck.masterwork_30.priceId ? `${priceCheck.masterwork_30.priceId.substring(0, 15)}...` : 'MISSING',
      masterwork_60_priceId: priceCheck.masterwork_60.priceId ? `${priceCheck.masterwork_60.priceId.substring(0, 15)}...` : 'MISSING',
      standard_60_priceId: priceCheck.standard_60.priceId ? `${priceCheck.standard_60.priceId.substring(0, 15)}...` : 'MISSING',
    },
  })
}
