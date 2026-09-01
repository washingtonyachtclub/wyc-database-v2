import db from '@/db'
import { membershipApplications } from '@/db/schema'
import { sendEmail } from '@/lib/email'
import { newMemberIncompleteReminderEmail } from '@/lib/emails/membership'
import { isDevEnvironment } from '@/lib/env'
import { and, eq, isNull, lte } from 'drizzle-orm'
import { applicationCompletionUrl } from './email'

const INCOMPLETE_REMINDER_DELAY_MS = 72 * 60 * 60 * 1000

export async function sendIncompleteApplicationReminders(input: {
  dryRun?: boolean
  origin: string
}) {
  const dryRun = input.dryRun ?? false
  const cutoff = new Date(Date.now() - INCOMPLETE_REMINDER_DELAY_MS)
  const applications = await db
    .select({
      applicationId: membershipApplications.id,
      firstName: membershipApplications.firstName,
      paymentCompletedAt: membershipApplications.paymentCompletedAt,
      primaryEmail: membershipApplications.primaryEmail,
    })
    .from(membershipApplications)
    .where(
      and(
        eq(membershipApplications.paymentStatus, 'completed'),
        eq(membershipApplications.reviewStatus, 'not_ready'),
        isNull(membershipApplications.requirementsCompletedAt),
        isNull(membershipApplications.completionReminderSentAt),
        isNull(membershipApplications.closedAt),
        lte(membershipApplications.paymentCompletedAt, cutoff),
      ),
    )
    .orderBy(membershipApplications.paymentCompletedAt)

  const deliveries: Array<{
    applicationId: string
    email: string
    status: 'failed' | 'planned' | 'sent'
  }> = []
  for (const application of applications) {
    if (dryRun) {
      deliveries.push({
        applicationId: application.applicationId,
        email: application.primaryEmail,
        status: 'planned',
      })
      continue
    }
    try {
      const completionUrl = applicationCompletionUrl(application.applicationId, input.origin)
      await sendEmail({
        idempotencyKey: `new-member-incomplete-reminder/${application.applicationId}`,
        subject: 'Reminder: finish your WYC membership application',
        text: newMemberIncompleteReminderEmail(application.firstName, completionUrl),
        to: application.primaryEmail,
      })
      await db
        .update(membershipApplications)
        .set({ completionReminderSentAt: new Date() })
        .where(
          and(
            eq(membershipApplications.id, application.applicationId),
            isNull(membershipApplications.completionReminderSentAt),
          ),
        )
      deliveries.push({
        applicationId: application.applicationId,
        email: application.primaryEmail,
        status: 'sent',
      })
    } catch (error) {
      console.error('Failed to send incomplete membership application reminder:', {
        applicationId: application.applicationId,
        error,
      })
      deliveries.push({
        applicationId: application.applicationId,
        email: application.primaryEmail,
        status: 'failed',
      })
    }
  }

  return {
    cutoff: cutoff.toISOString(),
    deliveries,
    dryRun,
    failed: deliveries.filter((delivery) => delivery.status === 'failed').length,
    planned: deliveries.length,
    sent: deliveries.filter((delivery) => delivery.status === 'sent').length,
    simulated: isDevEnvironment(),
  }
}
