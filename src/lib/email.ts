import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is missing')
}

const resend = new Resend(process.env.RESEND_API_KEY)

const SEND_DOMAIN = 'mail.washingtonyachtclub.org'
const FROM_ADDRESS = `Washington Yacht Club <database@${SEND_DOMAIN}>`
const REPLY_TO = 'contact@washingtonyachtclub.org'

export type SendEmailParams = {
  to: string | string[]
  subject: string
  text: string
  idempotencyKey: string
}

export async function sendEmail({ to, subject, text, idempotencyKey }: SendEmailParams) {
  const { data, error } = await resend.emails.send(
    {
      from: FROM_ADDRESS,
      replyTo: REPLY_TO,
      to: to,
      subject,
      text,
    },
    { idempotencyKey },
  )

  if (error) {
    console.error('Email send failed:', error)
    throw new Error('Failed to send email')
  }

  return data
}
