import db from '@/db'
import { membershipApplications } from '@/db/schema'
import { sendEmail } from '@/lib/email'
import {
  newMemberCompletionEmail,
  newMemberEmailFallback,
  returningMemberEmail,
} from '@/lib/emails/membership'
import { eq } from 'drizzle-orm'

export function applicationCompletionUrl(applicationId: string, origin: string): string {
  return new URL(`/join/${applicationId}`, origin).toString()
}

export async function sendApplicationCompletionEmail(input: {
  applicationId: string
  firstName: string
  lastName: string
  origin: string
  primaryEmail: string
  type: 'initial' | 'resend'
}) {
  const [delivery] = await db
    .select({ recoveryEmailSentAt: membershipApplications.recoveryEmailSentAt })
    .from(membershipApplications)
    .where(eq(membershipApplications.id, input.applicationId))
    .limit(1)
  const attempt =
    input.type === 'initial'
      ? 'initial'
      : `resend/${delivery?.recoveryEmailSentAt?.toISOString() ?? 'none'}`
  const completionUrl = applicationCompletionUrl(input.applicationId, input.origin)
  const result = await sendEmail({
    idempotencyKey: `new-member-completion/${input.applicationId}/${attempt}`,
    subject: 'Finish your WYC membership application',
    text: newMemberCompletionEmail(input.firstName, input.lastName, completionUrl),
    to: input.primaryEmail,
  })

  await db
    .update(membershipApplications)
    .set({ recoveryEmailSentAt: new Date() })
    .where(eq(membershipApplications.id, input.applicationId))
  return { emailSent: true, emailSimulated: result.simulated }
}

export async function sendNewMemberWelcomeEmail(input: {
  applicationId: string
  email: string
  firstName: string
  lastName: string
  wycNumber: number
}) {
  const result = await sendEmail({
    idempotencyKey: `new-member-application-welcome/${input.applicationId}`,
    subject: 'Welcome to the Washington Yacht Club!',
    text: newMemberEmailFallback({
      first: input.firstName,
      last: input.lastName,
      wycNumber: input.wycNumber,
    }),
    to: input.email,
  })
  return { emailSent: true, emailSimulated: result.simulated }
}

export async function sendExistingMemberApplicationEmail(input: {
  applicationId: string
  email: string
  expiryLabel: string
  firstName: string
  lastName: string
  wycNumber: number
}) {
  const result = await sendEmail({
    idempotencyKey: `existing-member-application-complete/${input.applicationId}`,
    subject: `Your WYC membership is active through ${input.expiryLabel}`,
    text: returningMemberEmail(input.firstName, input.lastName, input.wycNumber, input.expiryLabel),
    to: input.email,
  })
  return { emailSent: true, emailSimulated: result.simulated }
}
