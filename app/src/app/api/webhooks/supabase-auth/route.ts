import { NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email'
import { Webhook } from 'standardwebhooks'

// Supabase Auth Webhook - receives events from Supabase
// Configure in Supabase Dashboard > Authentication > Auth Hooks
// Uses Standard Webhooks format for signature verification

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
    // Get the raw body for signature verification
    const rawBody = await request.text()

    // Verify webhook signature (required in production)
    const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('SUPABASE_WEBHOOK_SECRET not configured')
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
      }
    } else {
      // Standard Webhooks verification
      const wh = new Webhook(webhookSecret)
      const headers = {
        'webhook-id': request.headers.get('webhook-id') || '',
        'webhook-timestamp': request.headers.get('webhook-timestamp') || '',
        'webhook-signature': request.headers.get('webhook-signature') || '',
      }

      try {
        wh.verify(rawBody, headers)
      } catch (err) {
        console.error('Webhook signature verification failed:', err)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const payload: AuthWebhookPayload = JSON.parse(rawBody)

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
