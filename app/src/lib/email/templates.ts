const baseStyles = `
  body { font-family: Georgia, 'Times New Roman', serif; line-height: 1.6; color: #1a1a1a; background: #faf6ed; margin: 0; padding: 0; }
  .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
  .header { text-align: center; margin-bottom: 32px; }
  .logo { font-size: 24px; font-weight: 600; color: #c4a35a; letter-spacing: 0.5px; }
  .content { background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  h1 { font-size: 28px; color: #1a2744; margin: 0 0 16px 0; font-weight: 500; }
  p { margin: 0 0 16px 0; color: #4a5568; }
  .button { display: inline-block; background: #c4a35a; color: #1a2744; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500; margin: 16px 0; }
  .footer { text-align: center; margin-top: 32px; font-size: 14px; color: #718096; }
  .divider { height: 1px; background: #e2e8f0; margin: 24px 0; }
`

function wrapTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Chronicle</div>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>Made with care by Chronicle</p>
      <p style="font-size: 12px; color: #a0aec0;">
        chronicle.town
      </p>
    </div>
  </div>
</body>
</html>
`
}

export function welcomeEmail(name: string): { subject: string; html: string } {
  const firstName = name?.split(' ')[0] || 'there'

  const content = `
    <h1>Welcome to Chronicle</h1>
    <p>Hi ${firstName},</p>
    <p>Thank you for joining Chronicle. We're building something special: an AI-native book creation platform that helps bring your stories to life.</p>
    <p>With Chronicle, you can:</p>
    <ul style="color: #4a5568; margin: 16px 0; padding-left: 24px;">
      <li>Create original stories from a simple prompt</li>
      <li>Generate AI covers for your books</li>
      <li>Listen to your stories with text-to-speech</li>
      <li>Share your creations with anyone</li>
      <li>Export to PDF and EPUB</li>
    </ul>
    <p>Ready to create your first story?</p>
    <a href="https://chronicle.town/create/new" class="button">Create Your First Story</a>
    <div class="divider"></div>
    <p style="font-size: 14px; color: #718096;">
      Have questions? Just reply to this email. We read every message.
    </p>
  `

  return {
    subject: 'Welcome to Chronicle',
    html: wrapTemplate(content),
  }
}

export function bookCompletedEmail(
  name: string,
  bookTitle: string,
  bookId: string
): { subject: string; html: string } {
  const firstName = name?.split(' ')[0] || 'there'

  const content = `
    <h1>Your Story is Ready</h1>
    <p>Hi ${firstName},</p>
    <p>Great news! Your book <strong>"${bookTitle}"</strong> has finished generating and is ready to read.</p>
    <a href="https://chronicle.town/create/read/${bookId}" class="button">Read Your Book</a>
    <div class="divider"></div>
    <p style="font-size: 14px;">With your completed book, you can now:</p>
    <ul style="color: #4a5568; margin: 16px 0; padding-left: 24px; font-size: 14px;">
      <li>Listen with our built-in audio player</li>
      <li>Download as PDF or EPUB</li>
      <li>Share with friends and family</li>
      <li>Regenerate the cover if you'd like a different one</li>
    </ul>
    <p style="font-size: 14px; color: #718096; margin-top: 24px;">
      Enjoy your story!
    </p>
  `

  return {
    subject: `Your book "${bookTitle}" is ready!`,
    html: wrapTemplate(content),
  }
}
