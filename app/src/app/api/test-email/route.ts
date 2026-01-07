import { NextResponse } from 'next/server'
import { sendWelcomeEmail, sendBookCompletedEmail } from '@/lib/email'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  const type = searchParams.get('type') || 'welcome'

  if (!email) {
    return NextResponse.json({ error: 'Email parameter required' }, { status: 400 })
  }

  try {
    let success = false

    if (type === 'welcome') {
      success = await sendWelcomeEmail(email, 'Test User')
    } else if (type === 'book') {
      success = await sendBookCompletedEmail(email, 'Test User', 'Test Book Title', 'test-book-id')
    }

    if (success) {
      return NextResponse.json({ success: true, message: `${type} email sent to ${email}` })
    } else {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }
  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
