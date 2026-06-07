import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { computeRenewal } from './compute-renewal'
import { parseQuestionnaire } from './questionnaire'
import db from '@/db/index'
import { EXEMPTION_APPROVER_POSITIONS } from '@/db/constants'
import {
  duesExemptionRequests,
  membershipPayments,
  officers,
  quarters,
  renewalQuestionnaire,
  wycDatabase,
} from '@/db/schema'
import { requireAuth } from '@/lib/auth/auth-middleware'
import { sendEmail } from '@/lib/email'
import { returningMemberEmail } from '@/lib/email-templates'

/** Whether a member is an active holder of an approver position (Commodore / Vice Commodore / Webmaster). */
async function isApprover(wycNumber: number): Promise<boolean> {
  const rows = await db
    .select({ position: officers.position })
    .from(officers)
    .where(
      and(
        eq(officers.member, wycNumber),
        eq(officers.active, 1),
        inArray(officers.position, [...EXEMPTION_APPROVER_POSITIONS]),
      ),
    )
    .limit(1)
  return rows.length > 0
}

/** requireAuth + approver-position check. Returns the approver's WYCNumber or throws. */
async function requireExemptionApprover(): Promise<number> {
  const wycNumber = await requireAuth()
  if (!(await isApprover(wycNumber))) {
    throw new Error('Forbidden: Insufficient privileges')
  }
  return wycNumber
}

/** Boolean approver check for route gating (does not throw on non-approver). */
export const getIsExemptionApprover = createServerFn({ method: 'GET' }).handler(async () => {
  const wycNumber = await requireAuth()
  return { isApprover: await isApprover(wycNumber) }
})

/**
 * Member self-service: request dues-exempt membership for the next eligible quarter.
 * No payment — just records a pending request for an approver to review. The target quarter
 * is frozen here (one quarter only, same baseline as a quarterly renewal).
 */
export const requestDuesExemption = createServerFn({ method: 'POST' })
  .inputValidator((input: { questionnaire: unknown }) => ({
    answers: parseQuestionnaire(input.questionnaire),
  }))
  .handler(async ({ data }) => {
    const wycNumber = await requireAuth()

    const [member] = await db
      .select({ expireQtrIndex: wycDatabase.expireQtrIndex })
      .from(wycDatabase)
      .where(eq(wycDatabase.wycNumber, wycNumber))
    if (!member) {
      console.error('requestDuesExemption: member not found for wycNumber', wycNumber)
      throw new Error('We could not find your membership record.')
    }

    // One open request per member.
    const [existing] = await db
      .select({ index: duesExemptionRequests.index })
      .from(duesExemptionRequests)
      .where(
        and(
          eq(duesExemptionRequests.wycNumber, wycNumber),
          eq(duesExemptionRequests.status, 'pending'),
        ),
      )
      .limit(1)
    if (existing) {
      throw new Error('You already have a dues-exemption request pending review.')
    }

    const expireQtr = member.expireQtrIndex ?? 0
    const requestedExpireQtr = computeRenewal(expireQtr, 'quarterly')

    const [request] = await db.insert(duesExemptionRequests).values({
      wycNumber,
      requestedExpireQtr,
      status: 'pending',
    })

    // Answers stay 'pending' until an approver acts; flipped to 'active' on approval, 'void' on denial.
    await db.insert(renewalQuestionnaire).values({
      wycNumber,
      quarter: requestedExpireQtr,
      uwStatus: data.answers.uwStatus,
      plusOneResponse: data.answers.plusOneResponse,
      status: 'pending',
      source: 'exempt',
      requestId: request.insertId,
    })

    return { success: true as const }
  })

/** Pending requests for the approval screen, with requester name, requested quarter, and current ExpireQtr. */
export const listPendingExemptionRequests = createServerFn({ method: 'GET' }).handler(async () => {
  await requireExemptionApprover()

  const rows = await db
    .select({
      index: duesExemptionRequests.index,
      wycNumber: duesExemptionRequests.wycNumber,
      requestedExpireQtr: duesExemptionRequests.requestedExpireQtr,
      createdAt: duesExemptionRequests.createdAt,
      first: wycDatabase.first,
      last: wycDatabase.last,
      currentExpireQtr: wycDatabase.expireQtrIndex,
    })
    .from(duesExemptionRequests)
    .innerJoin(wycDatabase, eq(duesExemptionRequests.wycNumber, wycDatabase.wycNumber))
    .where(eq(duesExemptionRequests.status, 'pending'))
    .orderBy(desc(duesExemptionRequests.createdAt))

  const labels = await db.select({ index: quarters.index, school: quarters.school }).from(quarters)
  const labelFor = (idx: number) => labels.find((q) => q.index === idx)?.school ?? `quarter ${idx}`

  return rows.map((r) => ({
    index: r.index,
    wycNumber: r.wycNumber,
    name: `${r.first ?? ''} ${r.last ?? ''}`.trim(),
    requestedExpireQtr: r.requestedExpireQtr,
    requestedLabel: labelFor(r.requestedExpireQtr),
    currentExpireQtr: r.currentExpireQtr ?? 0,
    currentLabel: labelFor(r.currentExpireQtr ?? 0),
    createdAt: r.createdAt,
  }))
})

function parseRequestId(input: { requestId: unknown }): { requestId: number } {
  const id = Number(input.requestId)
  if (!Number.isInteger(id) || id <= 0) throw new Error('Invalid request')
  return { requestId: id }
}

/**
 * Approve a pending request. If the member is already covered through the frozen target quarter,
 * the grant is a no-op (no ExpireQtr change, no ledger row); otherwise bump ExpireQtr and write the
 * EXEMPT membership_payments row. Either way the request is marked approved and the member emailed.
 */
export const approveExemptionRequest = createServerFn({ method: 'POST' })
  .inputValidator(parseRequestId)
  .handler(async ({ data }) => {
    const approver = await requireExemptionApprover()

    const [request] = await db
      .select({
        wycNumber: duesExemptionRequests.wycNumber,
        requestedExpireQtr: duesExemptionRequests.requestedExpireQtr,
        status: duesExemptionRequests.status,
      })
      .from(duesExemptionRequests)
      .where(eq(duesExemptionRequests.index, data.requestId))
    if (!request) throw new Error('Request not found.')
    if (request.status !== 'pending') throw new Error('This request has already been decided.')

    const [member] = await db
      .select({
        first: wycDatabase.first,
        last: wycDatabase.last,
        email: wycDatabase.email,
        expireQtrIndex: wycDatabase.expireQtrIndex,
      })
      .from(wycDatabase)
      .where(eq(wycDatabase.wycNumber, request.wycNumber))
    if (!member) {
      console.error('approveExemptionRequest: member not found', request.wycNumber)
      throw new Error('We could not find the requester’s membership record.')
    }

    const prevExpireQtr = member.expireQtrIndex ?? 0
    const target = request.requestedExpireQtr
    const alreadyCovered = prevExpireQtr >= target

    let paymentId: number | null = null
    try {
      if (!alreadyCovered) {
        await db
          .update(wycDatabase)
          .set({ expireQtrIndex: target })
          .where(eq(wycDatabase.wycNumber, request.wycNumber))

        const result = await db.insert(membershipPayments).values({
          wycNumber: request.wycNumber,
          squarePaymentId: null,
          squareOrderId: null,
          amountCents: 0,
          currency: 'USD',
          tier: 'exempt',
          duration: 'quarterly',
          prevExpireQtr,
          newExpireQtr: target,
          status: 'EXEMPT',
        })
        paymentId = result[0].insertId
      }

      await db
        .update(duesExemptionRequests)
        .set({
          status: 'approved',
          paymentId,
          decidedBy: approver,
          decidedAt: new Date(),
        })
        .where(eq(duesExemptionRequests.index, data.requestId))

      await db
        .update(renewalQuestionnaire)
        .set({ status: 'active' })
        .where(eq(renewalQuestionnaire.requestId, data.requestId))
    } catch (error) {
      console.error('approveExemptionRequest: DB update failed:', error)
      throw new Error('We could not approve this request. Please try again.')
    }

    // Confirmation email — only when a quarter was actually granted (a no-op grants nothing,
    // so emailing "you've been renewed" would be wrong). Non-fatal; reuses the renewal template.
    if (!alreadyCovered && member.email) {
      const [quarter] = await db
        .select({ school: quarters.school })
        .from(quarters)
        .where(eq(quarters.index, target))
      const quarterLabel = quarter?.school ?? `quarter ${target}`

      try {
        await sendEmail({
          to: member.email,
          subject: 'WYC Membership Renewed',
          text: returningMemberEmail(
            member.first ?? '',
            member.last ?? '',
            request.wycNumber,
            quarterLabel,
          ),
          idempotencyKey: `exemption/${request.wycNumber}/${target}`,
        })
      } catch (emailError) {
        console.error('approveExemptionRequest: failed to send confirmation email:', emailError)
      }
    }

    return { success: true as const, alreadyCovered }
  })

/** Deny a pending request. No reason is captured; a denied member may re-request. */
export const denyExemptionRequest = createServerFn({ method: 'POST' })
  .inputValidator(parseRequestId)
  .handler(async ({ data }) => {
    const approver = await requireExemptionApprover()

    const [request] = await db
      .select({ status: duesExemptionRequests.status })
      .from(duesExemptionRequests)
      .where(eq(duesExemptionRequests.index, data.requestId))
    if (!request) throw new Error('Request not found.')
    if (request.status !== 'pending') throw new Error('This request has already been decided.')

    await db
      .update(duesExemptionRequests)
      .set({ status: 'denied', decidedBy: approver, decidedAt: new Date() })
      .where(eq(duesExemptionRequests.index, data.requestId))

    await db
      .update(renewalQuestionnaire)
      .set({ status: 'void' })
      .where(eq(renewalQuestionnaire.requestId, data.requestId))

    return { success: true as const }
  })
