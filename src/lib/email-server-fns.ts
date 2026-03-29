import { createServerFn } from '@tanstack/react-start'
import { sendEmail } from './email'
import { requirePrivilege } from './auth-middleware'

export const sendTestEmailServerFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { to: string }) => {
    if (!input.to || !input.to.includes('@')) {
      throw new Error('Valid email address required')
    }
    return { to: String(input.to) }
  })
  .handler(async ({ data }) => {
    await requirePrivilege('db')

    try {
      const result = await sendEmail({
        to: data.to,
        subject: 'WYC Database - Test Email',
        text: 'This is a test email from the WYC Database system.\n\nIf you received this, email sending is working correctly.\n\nEshan Arora\nWebmaster',
        idempotencyKey: `test-email/${data.to}/${Date.now()}`,
      })
      return { success: true as const, emailId: result?.id }
    } catch (error) {
      console.error('Test email error:', error)
      return { success: false as const, message: 'Failed to send test email' }
    }
  })
