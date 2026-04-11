import { Resend } from 'resend'
import { isDevEnvironment } from './env'

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is missing')
}

const resend = new Resend(process.env.RESEND_API_KEY)

const SEND_DOMAIN = 'mail.washingtonyachtclub.org'
const FROM_ADDRESS = `Washington Yacht Club <database@${SEND_DOMAIN}>`
const REPLY_TO = 'contact@washingtonyachtclub.org'
const DEV_RECIPIENT = 'delivered@resend.dev'

export type SendEmailParams = {
  to: string | string[]
  subject: string
  text: string
  idempotencyKey: string
}

export type SendEmailResult = {
  id: string | undefined
  simulated: boolean
}

export async function sendEmail({
  to,
  subject,
  text,
  idempotencyKey,
}: SendEmailParams): Promise<SendEmailResult> {
  const simulated = isDevEnvironment()
  const actualTo = simulated ? DEV_RECIPIENT : to
  const actualKey = simulated ? `dev/${idempotencyKey}` : idempotencyKey

  if (simulated) {
    console.log('[DEV] Email simulated:', {
      originalTo: to,
      from: FROM_ADDRESS,
      replyTo: REPLY_TO,
      subject,
      text,
      idempotencyKey: actualKey,
    })
  }

  const { data, error } = await resend.emails.send(
    {
      from: FROM_ADDRESS,
      replyTo: REPLY_TO,
      to: actualTo,
      subject,
      text,
    },
    { idempotencyKey: actualKey },
  )

  if (error) {
    console.error('Email send failed:', error)
    throw new Error('Failed to send email')
  }

  return { id: data?.id, simulated }
}
