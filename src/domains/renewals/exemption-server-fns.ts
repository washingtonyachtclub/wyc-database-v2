import { EXEMPTION_APPROVER_POSITIONS } from '@/db/constants'
import db from '@/db/index'
import {
  duesExemptionRequests,
  memberWaivers,
  membershipPayments,
  membershipRenewals,
  officers,
  quarters,
  renewalQuestionnaire,
  wycDatabase,
} from '@/db/schema'
import { requireAuth } from '@/lib/auth/auth-middleware'
import { sendEmail } from '@/lib/email'
import { exemptionWaiverRequiredEmail } from '@/lib/emails/membership'
import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { computeRenewal } from './compute-renewal'
import { isUwStatus, parseQuestionnaire } from './questionnaire'
import {
  reconcileRenewal,
  sendRenewalCompletedEmail,
  type RenewalCompletion,
} from './renewal-coordinator'

async function sendExemptionWaiverEmail(input: {
  email: string | null
  first: string | null
  last: string | null
  renewalId: string
  targetExpireQtr: number
}) {
  const [quarter] = await db
    .select({ school: quarters.school })
    .from(quarters)
    .where(eq(quarters.index, input.targetExpireQtr))
  const quarterLabel = quarter?.school ?? `quarter ${input.targetExpireQtr}`
  if (!input.email) return { emailSent: false, emailSimulated: false }

  try {
    const result = await sendEmail({
      to: input.email,
      subject: 'Sign the waiver for your WYC dues-exemption request',
      text: exemptionWaiverRequiredEmail(input.first ?? '', input.last ?? '', quarterLabel),
      idempotencyKey: `exemption-waiver-required/${input.renewalId}`,
    })
    return { emailSent: true, emailSimulated: result.simulated }
  } catch (error) {
    console.error('sendExemptionWaiverEmail failed:', error)
    return { emailSent: false, emailSimulated: false }
  }
}

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
      .select({
        email: wycDatabase.email,
        expireQtrIndex: wycDatabase.expireQtrIndex,
        first: wycDatabase.first,
        last: wycDatabase.last,
      })
      .from(wycDatabase)
      .where(eq(wycDatabase.wycNumber, wycNumber))
    if (!member) {
      console.error('requestDuesExemption: member not found for wycNumber', wycNumber)
      throw new Error('We could not find your membership record.')
    }

    const [openRenewal] = await db
      .select({ id: membershipRenewals.id })
      .from(membershipRenewals)
      .where(
        and(
          eq(membershipRenewals.wycNumber, wycNumber),
          isNull(membershipRenewals.completedAt),
          isNull(membershipRenewals.closedAt),
        ),
      )
      .limit(1)
    if (openRenewal) {
      throw new Error('You already have a renewal in progress.')
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
    const renewalId = randomUUID()

    try {
      await db.transaction(async (tx) => {
        await tx.insert(membershipRenewals).values({
          id: renewalId,
          wycNumber,
          source: 'exempt',
          tier: 'exempt',
          duration: 'quarterly',
          previousExpireQtr: expireQtr,
          targetExpireQtr: requestedExpireQtr,
        })
        const [request] = await tx.insert(duesExemptionRequests).values({
          renewalId,
          wycNumber,
          requestedExpireQtr,
          status: 'pending',
        })

        await tx.insert(renewalQuestionnaire).values({
          renewalId,
          wycNumber,
          quarter: requestedExpireQtr,
          uwStatus: data.answers.uwStatus,
          plusOneResponse: data.answers.plusOneResponse,
          status: 'pending',
          source: 'exempt',
          requestId: request.insertId,
        })
      })
    } catch (error) {
      console.error('requestDuesExemption: DB write failed:', error)
      throw new Error('We could not submit your request. Please try again.')
    }

    const email = await sendExemptionWaiverEmail({
      email: member.email,
      first: member.first,
      last: member.last,
      renewalId,
      targetExpireQtr: requestedExpireQtr,
    })

    return { success: true as const, renewalId, ...email }
  })

export const cancelDuesExemption = createServerFn({ method: 'POST' }).handler(async () => {
  const wycNumber = await requireAuth()

  const [existing] = await db
    .select({ index: duesExemptionRequests.index, renewalId: duesExemptionRequests.renewalId })
    .from(duesExemptionRequests)
    .where(
      and(
        eq(duesExemptionRequests.wycNumber, wycNumber),
        eq(duesExemptionRequests.status, 'pending'),
      ),
    )
    .limit(1)
  // Nothing open to cancel (already decided, or none) — treat as success so the UI settles.
  if (!existing) return { success: true as const }

  try {
    await db.transaction(async (tx) => {
      const [locked] = await tx
        .select({ status: duesExemptionRequests.status })
        .from(duesExemptionRequests)
        .where(eq(duesExemptionRequests.index, existing.index))
        .for('update')
      if (!locked || locked.status !== 'pending') return

      await tx
        .update(duesExemptionRequests)
        .set({ status: 'cancelled', decidedAt: new Date() })
        .where(eq(duesExemptionRequests.index, existing.index))
      await tx
        .update(renewalQuestionnaire)
        .set({ status: 'void' })
        .where(eq(renewalQuestionnaire.requestId, existing.index))
      if (existing.renewalId) {
        await tx
          .update(membershipRenewals)
          .set({ closedAt: new Date() })
          .where(eq(membershipRenewals.id, existing.renewalId))
      }
    })
  } catch (error) {
    console.error('cancelDuesExemption: DB update failed:', error)
    throw new Error('We could not cancel your request. Please try again.')
  }

  return { success: true as const }
})

/** Pending requests for the approval screen, with requester name, requested quarter, and current ExpireQtr. */
export const listPendingExemptionRequests = createServerFn({ method: 'GET' }).handler(async () => {
  await requireExemptionApprover()

  const rows = await db
    .select({
      index: duesExemptionRequests.index,
      renewalId: duesExemptionRequests.renewalId,
      wycNumber: duesExemptionRequests.wycNumber,
      requestedExpireQtr: duesExemptionRequests.requestedExpireQtr,
      createdAt: duesExemptionRequests.createdAt,
      first: wycDatabase.first,
      last: wycDatabase.last,
      currentExpireQtr: wycDatabase.expireQtrIndex,
      waiverId: memberWaivers.id,
    })
    .from(duesExemptionRequests)
    .innerJoin(wycDatabase, eq(duesExemptionRequests.wycNumber, wycDatabase.wycNumber))
    .leftJoin(memberWaivers, eq(memberWaivers.renewalId, duesExemptionRequests.renewalId))
    .where(eq(duesExemptionRequests.status, 'pending'))
    .orderBy(desc(duesExemptionRequests.createdAt))

  const labels = await db.select({ index: quarters.index, school: quarters.school }).from(quarters)
  const labelFor = (idx: number) => labels.find((q) => q.index === idx)?.school ?? `quarter ${idx}`

  return rows.map((r) => ({
    index: r.index,
    renewalId: r.renewalId,
    wycNumber: r.wycNumber,
    name: `${r.first ?? ''} ${r.last ?? ''}`.trim(),
    requestedExpireQtr: r.requestedExpireQtr,
    requestedLabel: labelFor(r.requestedExpireQtr),
    currentExpireQtr: r.currentExpireQtr ?? 0,
    currentLabel: labelFor(r.currentExpireQtr ?? 0),
    createdAt: r.createdAt,
    waiverComplete: r.waiverId !== null,
  }))
})

function parseRequestId(input: { requestId: unknown }): { requestId: number } {
  const id = Number(input.requestId)
  if (!Number.isInteger(id) || id <= 0) throw new Error('Invalid request')
  return { requestId: id }
}

export const approveExemptionRequest = createServerFn({ method: 'POST' })
  .inputValidator(parseRequestId)
  .handler(async ({ data }) => {
    const approver = await requireExemptionApprover()

    const [request] = await db
      .select({
        currentExpireQtr: wycDatabase.expireQtrIndex,
        renewalId: duesExemptionRequests.renewalId,
        wycNumber: duesExemptionRequests.wycNumber,
        requestedExpireQtr: duesExemptionRequests.requestedExpireQtr,
        status: duesExemptionRequests.status,
        uwStatus: renewalQuestionnaire.uwStatus,
        waiverId: memberWaivers.id,
      })
      .from(duesExemptionRequests)
      .innerJoin(wycDatabase, eq(wycDatabase.wycNumber, duesExemptionRequests.wycNumber))
      .leftJoin(
        renewalQuestionnaire,
        eq(renewalQuestionnaire.requestId, duesExemptionRequests.index),
      )
      .leftJoin(memberWaivers, eq(memberWaivers.renewalId, duesExemptionRequests.renewalId))
      .where(eq(duesExemptionRequests.index, data.requestId))
    if (!request) throw new Error('Request not found.')
    if (request.status !== 'pending') throw new Error('This request has already been decided.')
    const uwStatus = request.uwStatus
    if (!isUwStatus(uwStatus)) {
      console.error('approveExemptionRequest: invalid questionnaire status', {
        requestId: data.requestId,
        uwStatus,
      })
      throw new Error('We could not read the request questionnaire.')
    }
    if (!request.renewalId) throw new Error('This request has no renewal workflow.')
    if (!request.waiverId) throw new Error('The member must sign the waiver before approval.')

    const alreadyCovered = (request.currentExpireQtr ?? 0) >= request.requestedExpireQtr
    let completion: RenewalCompletion | null = null
    try {
      await db.transaction(async (tx) => {
        const [lockedRequest] = await tx
          .select({
            renewalId: duesExemptionRequests.renewalId,
            status: duesExemptionRequests.status,
          })
          .from(duesExemptionRequests)
          .where(eq(duesExemptionRequests.index, data.requestId))
          .for('update')
        if (
          !lockedRequest ||
          lockedRequest.status !== 'pending' ||
          lockedRequest.renewalId !== request.renewalId
        ) {
          throw new Error('The request is no longer pending.')
        }

        const [lockedWaiver] = await tx
          .select({ id: memberWaivers.id })
          .from(memberWaivers)
          .where(eq(memberWaivers.renewalId, request.renewalId!))
          .for('update')
        if (!lockedWaiver) throw new Error('The member waiver is not complete.')

        const result = await tx.insert(membershipPayments).values({
          renewalId: request.renewalId,
          wycNumber: request.wycNumber,
          squarePaymentId: null,
          squareOrderId: null,
          amountCents: 0,
          currency: 'USD',
          tier: 'exempt',
          duration: 'quarterly',
          prevExpireQtr: request.currentExpireQtr ?? 0,
          newExpireQtr: Math.max(request.currentExpireQtr ?? 0, request.requestedExpireQtr),
          status: 'EXEMPT',
        })

        await tx
          .update(duesExemptionRequests)
          .set({
            status: 'approved',
            paymentId: result[0].insertId,
            decidedBy: approver,
            decidedAt: new Date(),
          })
          .where(eq(duesExemptionRequests.index, data.requestId))

        completion = await reconcileRenewal(tx, request.renewalId!)
        if (!completion) throw new Error('The renewal requirements are incomplete.')
      })
    } catch (error) {
      console.error('approveExemptionRequest: DB update failed:', error)
      throw new Error('We could not approve this request. Please try again.')
    }

    const email = await sendRenewalCompletedEmail(completion!)

    return { success: true as const, alreadyCovered, ...email }
  })

/** Deny a pending request. No reason is captured; a denied member may re-request. */
export const denyExemptionRequest = createServerFn({ method: 'POST' })
  .inputValidator(parseRequestId)
  .handler(async ({ data }) => {
    const approver = await requireExemptionApprover()

    const [request] = await db
      .select({
        renewalId: duesExemptionRequests.renewalId,
        status: duesExemptionRequests.status,
      })
      .from(duesExemptionRequests)
      .where(eq(duesExemptionRequests.index, data.requestId))
    if (!request) throw new Error('Request not found.')
    if (request.status !== 'pending') throw new Error('This request has already been decided.')

    try {
      await db.transaction(async (tx) => {
        const [lockedRequest] = await tx
          .select({
            renewalId: duesExemptionRequests.renewalId,
            status: duesExemptionRequests.status,
          })
          .from(duesExemptionRequests)
          .where(eq(duesExemptionRequests.index, data.requestId))
          .for('update')
        if (!lockedRequest || lockedRequest.status !== 'pending') {
          throw new Error('The request is no longer pending.')
        }

        await tx
          .update(duesExemptionRequests)
          .set({ status: 'denied', decidedBy: approver, decidedAt: new Date() })
          .where(eq(duesExemptionRequests.index, data.requestId))
        await tx
          .update(renewalQuestionnaire)
          .set({ status: 'void' })
          .where(eq(renewalQuestionnaire.requestId, data.requestId))
        if (lockedRequest.renewalId) {
          await tx
            .update(membershipRenewals)
            .set({ closedAt: new Date() })
            .where(eq(membershipRenewals.id, lockedRequest.renewalId))
        }
      })
    } catch (error) {
      console.error('denyExemptionRequest: DB update failed:', error)
      throw new Error('We could not deny this request. Please try again.')
    }

    return { success: true as const }
  })
