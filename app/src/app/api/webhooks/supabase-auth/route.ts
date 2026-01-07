import { NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email'

// Supabase Auth Webhook - receives events from Supabase
// Configure in Supabase Dashboard > Authentication > Hooks > Send Webhook

interface AuthWebhookPayload {
  type: string
  table: string
  record: {
    id: string
    email: string
    raw_user_meta_data?: {
      full_name?: string
      name?: string
    }
    created_at: string
  }
  old_record?: unknown
}

export async function POST(request: Request) {
  try {
    // Verify webhook secret if configured
    const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET
    if (webhookSecret) {
      const authHeader = request.headers.get('authorization')
      if (authHeader !== `Bearer ${webhookSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const payload: AuthWebhookPayload = await request.json()

    // Handle user creation event
    if (payload.type === 'INSERT' && payload.table === 'users') {
      const { record } = payload
      const email = record.email
      const name = record.raw_user_meta_data?.full_name || record.raw_user_meta_data?.name || ''

      if (email) {
        await sendWelcomeEmail(email, name)
        console.log(`Welcome email sent to ${email}`)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
