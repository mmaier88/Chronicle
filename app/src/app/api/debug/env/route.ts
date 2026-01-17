import { NextRequest, NextResponse } from 'next/server'
import { getUser, createServiceClient } from '@/lib/supabase/server'
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
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_API_KEY_PREFIX: process.env.ANTHROPIC_API_KEY?.substring(0, 15),
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

  // Test DB connection with service client
  let dbTest = { success: false, error: null as string | null, paymentCount: 0 }
  try {
    const supabase = createServiceClient()
    const { data, error, count } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .limit(1)

    if (error) {
      dbTest.error = error.message
    } else {
      dbTest.success = true
      dbTest.paymentCount = count || 0
    }
  } catch (e) {
    dbTest.error = (e as Error).message
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
    dbTest,
  })
}
