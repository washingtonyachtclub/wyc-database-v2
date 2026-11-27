import { atomicWrite } from '@/db/atomic'
import { readQuarterConfig } from '@/domains/quarters/config'
import db from '@/db/index'
import {
  duesExemptionRequests,
  memberWaivers,
  membershipRenewals,
  quarters,
  renewalQuestionnaire,
  wycDatabase,
} from '@/db/schema'
import { requireAuth, requireRouteAccess } from '@/lib/auth/auth-middleware'
import { sendEmail } from '@/lib/email'
import { exemptionWaiverRequiredEmail } from '@/lib/emails/membership'
import { insertExemptMembershipPayment } from '@/domains/membership-payments/exempt-payment'
import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, isNull } from 'drizzle-orm'
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

/**
 * Member self-service: request dues-exempt membership for the next eligible quarter.
 * No payment — just records a pending request for an approver to review. The target quarter
 * is frozen here (one quarter only, same baseline as a quarterly renewal).
 */
export const requestDuesExemption = createServerFn({ method: 'POST' })
  .validator((input: { questionnaire: unknown }) => ({
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
    const requestedExpireQtr = computeRenewal(
      expireQtr,
      'quarterly',
      (await readQuarterConfig()).renewalQuarter,
    )
    const renewalId = randomUUID()

    try {
      await atomicWrite(async (tx) => {
        tx.add(
          db.insert(membershipRenewals).values({
            id: renewalId,
            wycNumber,
            source: 'exempt',
            tier: 'exempt',
            duration: 'quarterly',
            previousExpireQtr: expireQtr,
            targetExpireQtr: requestedExpireQtr,
          }),
        )
        const requestId = await tx.nextId(duesExemptionRequests)
        tx.add(
          db
            .insert(duesExemptionRequests)
            .values({
              index: requestId,
              renewalId,
              wycNumber,
              requestedExpireQtr,
              status: 'pending',
            }),
        )

        tx.add(
          db.insert(renewalQuestionnaire).values({
            renewalId,
            wycNumber,
            quarter: requestedExpireQtr,
            uwStatus: data.answers.uwStatus,
            plusOneResponse: data.answers.plusOneResponse,
            status: 'pending',
            source: 'exempt',
            requestId,
          }),
        )
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
    await atomicWrite(async (tx) => {
      const [locked] = await db
        .select({ status: duesExemptionRequests.status })
        .from(duesExemptionRequests)
        .where(eq(duesExemptionRequests.index, existing.index))
      if (!locked || locked.status !== 'pending') return

      tx.add(
        db
          .update(duesExemptionRequests)
          .set({ status: 'cancelled', decidedAt: new Date() })
          .where(eq(duesExemptionRequests.index, existing.index)),
      )
      tx.add(
        db
          .update(renewalQuestionnaire)
          .set({ status: 'void' })
          .where(eq(renewalQuestionnaire.requestId, existing.index)),
      )
      if (existing.renewalId) {
        tx.add(
          db
            .update(membershipRenewals)
            .set({ closedAt: new Date() })
            .where(eq(membershipRenewals.id, existing.renewalId)),
        )
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
  await requireRouteAccess('/membership-approvals')

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
  .validator(parseRequestId)
  .handler(async ({ data }) => {
    const approver = await requireRouteAccess('/membership-approvals')

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
    const renewalId = request.renewalId
    if (!renewalId) throw new Error('This request has no renewal workflow.')
    if (!request.waiverId) throw new Error('The member must sign the waiver before approval.')

    const alreadyCovered = (request.currentExpireQtr ?? 0) >= request.requestedExpireQtr
    let completion: RenewalCompletion | null = null
    try {
      await atomicWrite(async (tx) => {
        const [lockedRequest] = await db
          .select({
            renewalId: duesExemptionRequests.renewalId,
            status: duesExemptionRequests.status,
          })
          .from(duesExemptionRequests)
          .where(eq(duesExemptionRequests.index, data.requestId))
        if (
          !lockedRequest ||
          lockedRequest.status !== 'pending' ||
          lockedRequest.renewalId !== renewalId
        ) {
          throw new Error('The request is no longer pending.')
        }

        const [lockedWaiver] = await db
          .select({ id: memberWaivers.id })
          .from(memberWaivers)
          .where(eq(memberWaivers.renewalId, renewalId))
        if (!lockedWaiver) throw new Error('The member waiver is not complete.')

        const paymentId = await insertExemptMembershipPayment(tx, {
          renewalId,
          wycNumber: request.wycNumber,
          prevExpireQtr: request.currentExpireQtr ?? 0,
          newExpireQtr: Math.max(request.currentExpireQtr ?? 0, request.requestedExpireQtr),
        })

        tx.add(
          db
            .update(duesExemptionRequests)
            .set({
              status: 'approved',
              paymentId,
              decidedBy: approver,
              decidedAt: new Date(),
            })
            .where(eq(duesExemptionRequests.index, data.requestId)),
        )

        completion = await reconcileRenewal(tx, renewalId, 'exemption-approval')
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
  .validator(parseRequestId)
  .handler(async ({ data }) => {
    const approver = await requireRouteAccess('/membership-approvals')

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
      await atomicWrite(async (tx) => {
        const [lockedRequest] = await db
          .select({
            renewalId: duesExemptionRequests.renewalId,
            status: duesExemptionRequests.status,
          })
          .from(duesExemptionRequests)
          .where(eq(duesExemptionRequests.index, data.requestId))
        if (!lockedRequest || lockedRequest.status !== 'pending') {
          throw new Error('The request is no longer pending.')
        }

        tx.add(
          db
            .update(duesExemptionRequests)
            .set({ status: 'denied', decidedBy: approver, decidedAt: new Date() })
            .where(eq(duesExemptionRequests.index, data.requestId)),
        )
        tx.add(
          db
            .update(renewalQuestionnaire)
            .set({ status: 'void' })
            .where(eq(renewalQuestionnaire.requestId, data.requestId)),
        )
        if (lockedRequest.renewalId) {
          tx.add(
            db
              .update(membershipRenewals)
              .set({ closedAt: new Date() })
              .where(eq(membershipRenewals.id, lockedRequest.renewalId)),
          )
        }
      })
    } catch (error) {
      console.error('denyExemptionRequest: DB update failed:', error)
      throw new Error('We could not deny this request. Please try again.')
    }

    return { success: true as const }
  })
