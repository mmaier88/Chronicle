import { sendEmail } from './sendgrid'
import { welcomeEmail, bookCompletedEmail } from './templates'

export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<boolean> {
  const template = welcomeEmail(name)
  return sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  })
}

export async function sendBookCompletedEmail(
  email: string,
  name: string,
  bookTitle: string,
  bookId: string
): Promise<boolean> {
  const template = bookCompletedEmail(name, bookTitle, bookId)
  return sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
  })
}

export { sendEmail } from './sendgrid'
