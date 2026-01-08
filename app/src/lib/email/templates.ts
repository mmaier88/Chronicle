// Dark CI email wrapper - table-based for email client compatibility
function wrapTemplate(content: string): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin: 0; padding: 0; background-color: #0f1623; font-family: Georgia, Times, serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f1623;">
    <tr>
      <td align="center" style="padding: 50px 20px;">
        <table border="0" cellpadding="0" cellspacing="0" width="520" style="max-width: 520px;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 40px;">
              <span style="font-family: Georgia, Times, serif; font-size: 36px; font-weight: normal; color: #faf6ed; letter-spacing: 1px;">Chronicle</span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 0 20px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 50px;">
              <span style="font-family: Georgia, Times, serif; font-size: 13px; color: #4a4540;">chronicle.town</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// Reusable button component
function emailButton(text: string, url: string): string {
  return `<table border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" bgcolor="#e8c49a" style="border-radius: 30px;">
        <a href="${url}" target="_blank" style="display: inline-block; padding: 16px 40px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 600; color: #1a1a1a; text-decoration: none;">${text}</a>
      </td>
    </tr>
  </table>`
}

export function welcomeEmail(name: string): { subject: string; html: string; text: string } {
  const firstName = name?.split(' ')[0] || ''
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,'

  const text = `${greeting}

I'm Markus, the founder of Chronicle. I'm really glad you're here.

Chronicle began with a simple belief: stories matter more when they feel personal.

Most books and media are made for everyone at once. Chronicle is different. Here, stories adapt to you. Your interests, your mood, your curiosity, your pace.

Whether you want to explore new worlds, revisit familiar ones, or create something just for yourself, Chronicle is meant to feel calm and intentional. Not noisy. Not overwhelming. Just a place where stories fit a little better.

We're building Chronicle slowly and thoughtfully. We care about quality, not volume. About meaning, not hype.

Thank you for being here and for trusting us with your time.

Best,
Markus
Founder, Chronicle`

  const content = `
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="font-family: Georgia, Times, serif; font-size: 17px; line-height: 28px; color: #b8b0a0; padding-bottom: 24px;">
          ${greeting}
        </td>
      </tr>
      <tr>
        <td style="font-family: Georgia, Times, serif; font-size: 17px; line-height: 28px; color: #b8b0a0; padding-bottom: 20px;">
          I'm Markus, the founder of Chronicle. I'm really glad you're here.
        </td>
      </tr>
      <tr>
        <td style="font-family: Georgia, Times, serif; font-size: 16px; line-height: 26px; color: #8a8480; padding-bottom: 16px;">
          Chronicle began with a simple belief: stories matter more when they feel personal.
        </td>
      </tr>
      <tr>
        <td style="font-family: Georgia, Times, serif; font-size: 16px; line-height: 26px; color: #8a8480; padding-bottom: 16px;">
          Most books and media are made for everyone at once. Chronicle is different. Here, stories adapt to you. Your interests, your mood, your curiosity, your pace.
        </td>
      </tr>
      <tr>
        <td style="font-family: Georgia, Times, serif; font-size: 16px; line-height: 26px; color: #8a8480; padding-bottom: 16px;">
          We're building Chronicle slowly and thoughtfully. We care about quality, not volume. About meaning, not hype.
        </td>
      </tr>
      <tr>
        <td style="font-family: Georgia, Times, serif; font-size: 16px; line-height: 26px; color: #8a8480; padding-bottom: 30px;">
          Thank you for being here.
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-bottom: 30px;">
          ${emailButton('Start your first story', 'https://chronicle.town/create/new')}
        </td>
      </tr>
      <tr>
        <td style="font-family: Georgia, Times, serif; font-size: 15px; line-height: 24px; color: #6b6560;">
          Best,<br/>
          Markus<br/>
          <span style="color: #4a4540;">Founder, Chronicle</span>
        </td>
      </tr>
    </table>`

  return {
    subject: 'Welcome to Chronicle',
    html: wrapTemplate(content),
    text,
  }
}

export function bookCompletedEmail(
  name: string,
  bookTitle: string,
  bookId: string
): { subject: string; html: string; text: string } {
  const firstName = name?.split(' ')[0] || ''
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,'

  const text = `${greeting}

Great news! Your book "${bookTitle}" has finished generating and is ready to read.

Read it here: https://chronicle.town/create/read/${bookId}

With your completed book, you can:
- Listen with the built-in audio player
- Download as PDF or EPUB
- Share with friends and family

Enjoy your story!

Chronicle`

  const content = `
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="font-family: Georgia, Times, serif; font-size: 17px; line-height: 28px; color: #b8b0a0; padding-bottom: 20px;">
          ${greeting}
        </td>
      </tr>
      <tr>
        <td style="font-family: Georgia, Times, serif; font-size: 17px; line-height: 28px; color: #b8b0a0; padding-bottom: 30px;">
          Great news! Your book <span style="color: #e8c49a;">"${bookTitle}"</span> has finished generating and is ready to read.
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-bottom: 35px;">
          ${emailButton('Read Your Book', `https://chronicle.town/create/read/${bookId}`)}
        </td>
      </tr>
      <tr>
        <td style="font-family: Georgia, Times, serif; font-size: 15px; line-height: 24px; color: #6b6560; padding-bottom: 16px;">
          With your completed book, you can:
        </td>
      </tr>
      <tr>
        <td style="font-family: Georgia, Times, serif; font-size: 15px; line-height: 26px; color: #6b6560; padding-left: 16px; padding-bottom: 24px;">
          • Listen with the built-in audio player<br/>
          • Download as PDF or EPUB<br/>
          • Share with friends and family
        </td>
      </tr>
      <tr>
        <td style="font-family: Georgia, Times, serif; font-size: 16px; line-height: 24px; color: #8a8480;">
          Enjoy your story!
        </td>
      </tr>
    </table>`

  return {
    subject: `Your story "${bookTitle}" is ready`,
    html: wrapTemplate(content),
    text,
  }
}
