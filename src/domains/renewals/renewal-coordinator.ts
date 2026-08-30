import db from '@/db'
import {
  duesExemptionRequests,
  memberWaivers,
  membershipPayments,
  membershipRenewals,
  quarters,
  renewalQuestionnaire,
  wycDatabase,
} from '@/db/schema'
import { sendEmail } from '@/lib/email'
import { returningMemberEmail } from '@/lib/emails/membership'
import { and, eq, isNull } from 'drizzle-orm'
import { categoryIdForUwStatus, isUwStatus } from './questionnaire'

export type RenewalCompletion = {
  first: string
  last: string
  email: string | null
  renewalId: string
  targetExpireQtr: number
  wycNumber: number
}

type RenewalTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

export async function reconcileRenewal(
  tx: RenewalTransaction,
  renewalId: string,
): Promise<RenewalCompletion | null> {
  const [row] = await tx
    .select({
      closedAt: membershipRenewals.closedAt,
      completedAt: membershipRenewals.completedAt,
      email: wycDatabase.email,
      exemptionStatus: duesExemptionRequests.status,
      first: wycDatabase.first,
      last: wycDatabase.last,
      memberExpireQtr: wycDatabase.expireQtrIndex,
      paymentStatus: membershipPayments.status,
      source: membershipRenewals.source,
      targetExpireQtr: membershipRenewals.targetExpireQtr,
      uwStatus: renewalQuestionnaire.uwStatus,
      waiverId: memberWaivers.id,
      wycNumber: membershipRenewals.wycNumber,
    })
    .from(membershipRenewals)
    .innerJoin(wycDatabase, eq(wycDatabase.wycNumber, membershipRenewals.wycNumber))
    .leftJoin(membershipPayments, eq(membershipPayments.renewalId, membershipRenewals.id))
    .leftJoin(memberWaivers, eq(memberWaivers.renewalId, membershipRenewals.id))
    .leftJoin(duesExemptionRequests, eq(duesExemptionRequests.renewalId, membershipRenewals.id))
    .leftJoin(renewalQuestionnaire, eq(renewalQuestionnaire.renewalId, membershipRenewals.id))
    .where(eq(membershipRenewals.id, renewalId))
    .for('update')

  if (!row || row.completedAt || row.closedAt || !row.waiverId) return null

  const fundingComplete =
    row.source === 'paid'
      ? row.paymentStatus === 'COMPLETED'
      : row.source === 'exempt' &&
        row.paymentStatus === 'EXEMPT' &&
        row.exemptionStatus === 'approved'
  if (!fundingComplete) return null

  const update = {
    expireQtrIndex: Math.max(row.memberExpireQtr ?? 0, row.targetExpireQtr),
    ...(isUwStatus(row.uwStatus) && { categoryId: categoryIdForUwStatus(row.uwStatus) }),
  }

  await tx.update(wycDatabase).set(update).where(eq(wycDatabase.wycNumber, row.wycNumber))
  await tx
    .update(renewalQuestionnaire)
    .set({ status: 'active' })
    .where(eq(renewalQuestionnaire.renewalId, renewalId))
  await tx
    .update(membershipRenewals)
    .set({ completedAt: new Date() })
    .where(
      and(
        eq(membershipRenewals.id, renewalId),
        isNull(membershipRenewals.completedAt),
        isNull(membershipRenewals.closedAt),
      ),
    )

  return {
    first: row.first ?? '',
    last: row.last ?? '',
    email: row.email,
    renewalId,
    targetExpireQtr: row.targetExpireQtr,
    wycNumber: row.wycNumber,
  }
}

export async function sendRenewalCompletedEmail(completion: RenewalCompletion) {
  const [quarter] = await db
    .select({ school: quarters.school })
    .from(quarters)
    .where(eq(quarters.index, completion.targetExpireQtr))
  const quarterLabel = quarter?.school ?? `quarter ${completion.targetExpireQtr}`

  if (!completion.email) {
    return { emailSent: false, emailSimulated: false, quarterLabel }
  }

  try {
    const result = await sendEmail({
      to: completion.email,
      subject: 'WYC Membership Renewed',
      text: returningMemberEmail(
        completion.first,
        completion.last,
        completion.wycNumber,
        quarterLabel,
      ),
      idempotencyKey: `renewal-complete/${completion.renewalId}`,
    })
    return { emailSent: true, emailSimulated: result.simulated, quarterLabel }
  } catch (error) {
    console.error('sendRenewalCompletedEmail failed:', error)
    return { emailSent: false, emailSimulated: false, quarterLabel }
  }
}
