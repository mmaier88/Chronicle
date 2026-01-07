import { NextResponse } from 'next/server'
import sgMail from '@sendgrid/mail'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  const type = searchParams.get('type') || 'welcome'

  const apiKey = process.env.SENDGRID_API_KEY

  if (!email) {
    return NextResponse.json({ error: 'Email parameter required' }, { status: 400 })
  }

  if (!apiKey) {
    return NextResponse.json({
      error: 'SENDGRID_API_KEY not configured',
      hasKey: false
    }, { status: 500 })
  }

  sgMail.setApiKey(apiKey)

  try {
    const subject = type === 'welcome' ? 'Welcome to Chronicle' : 'Your book is ready!'

    await sgMail.send({
      to: email,
      from: {
        email: 'hello@chronicle.town',
        name: 'Chronicle',
      },
      subject: `[TEST] ${subject}`,
      html: `<h1>Test Email</h1><p>This is a test ${type} email sent to ${email}</p>`,
      text: `Test ${type} email sent to ${email}`,
    })

    return NextResponse.json({
      success: true,
      message: `${type} email sent to ${email}`,
      apiKeyPrefix: apiKey.substring(0, 10) + '...'
    })
  } catch (error: unknown) {
    const err = error as { response?: { body?: unknown }, message?: string }
    console.error('SendGrid error:', err.response?.body || error)
    return NextResponse.json({
      error: 'SendGrid error',
      details: err.response?.body || err.message || String(error),
      apiKeyPrefix: apiKey.substring(0, 10) + '...'
    }, { status: 500 })
  }
}
