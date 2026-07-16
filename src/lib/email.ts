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

// Batching is what keeps a large fan-out under Resend's 5 req/sec account limit.
const RESEND_BATCH_LIMIT = 100

export type BatchMessage = {
  to: string
  subject: string
  text: string
}

export type SendEmailBatchResult = {
  ids: string[]
  simulated: boolean
}

async function sendOneBatch(messages: BatchMessage[], key: string, simulated: boolean) {
  if (simulated) {
    console.log('[DEV] Email batch simulated:', {
      count: messages.length,
      idempotencyKey: key,
      messages: messages.map((m) => ({ originalTo: m.to, subject: m.subject, text: m.text })),
    })
  }

  const { data, error } = await resend.batch.send(
    messages.map((m) => ({
      from: FROM_ADDRESS,
      replyTo: REPLY_TO,
      to: simulated ? DEV_RECIPIENT : m.to,
      subject: m.subject,
      text: m.text,
    })),
    { idempotencyKey: key },
  )

  if (error) {
    console.error('Email batch send failed:', error)
    throw new Error('Failed to send email batch')
  }

  return (data?.data ?? []).map((d) => d.id)
}

// Resend honours `idempotencyKey` for 24h: the same key carrying the same messages in the
// same order is deduped rather than resent.
export async function sendEmailBatch(
  messages: BatchMessage[],
  idempotencyKey: string,
): Promise<SendEmailBatchResult> {
  const simulated = isDevEnvironment()
  const baseKey = simulated ? `dev/${idempotencyKey}` : idempotencyKey

  const ids: string[] = []
  for (let i = 0; i < messages.length; i += RESEND_BATCH_LIMIT) {
    const chunk = messages.slice(i, i + RESEND_BATCH_LIMIT)
    ids.push(...(await sendOneBatch(chunk, `${baseKey}/${i}`, simulated)))
  }

  return { ids, simulated }
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
