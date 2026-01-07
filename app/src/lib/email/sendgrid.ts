import sgMail from '@sendgrid/mail'

const apiKey = process.env.SENDGRID_API_KEY
if (apiKey) {
  sgMail.setApiKey(apiKey)
}

const FROM_EMAIL = 'hello@chronicle.town'
const FROM_NAME = 'Chronicle'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!apiKey) {
    console.warn('SENDGRID_API_KEY not set, skipping email')
    return false
  }

  try {
    await sgMail.send({
      to: options.to,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
    })
    console.log(`Email sent to ${options.to}: ${options.subject}`)
    return true
  } catch (error) {
    console.error('SendGrid error:', error)
    return false
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
