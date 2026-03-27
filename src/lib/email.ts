import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is missing')
}

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_ADDRESS = 'WYC Webmaster <webmaster@washingtonyachtclub.org>'

export type SendEmailParams = {
  to: string | string[]
  subject: string
  text: string
  idempotencyKey?: string
}

export async function sendEmail({
  to,
  subject,
  text,
  idempotencyKey,
}: SendEmailParams) {
  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: Array.isArray(to) ? to : [to],
    subject,
    text,
    ...(idempotencyKey ? { idempotencyKey } : {}),
  })

  if (error) {
    console.error('Email send failed:', error)
    throw new Error('Failed to send email')
  }

  return data
}
