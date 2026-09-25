import db from '@/db/index'
import {
  duesExemptionRequests,
  lessonQuarter,
  memberWaivers,
  membershipPayments,
  membershipRenewals,
  quarters,
  renewalQuestionnaire,
  wycDatabase,
} from '@/db/schema'
import { requireAuth } from '@/lib/auth/auth-middleware'
import {
  MembershipPaymentError,
  chargeMembershipOrder,
  createMembershipOrder,
  getMembershipPrice,
} from '@/domains/membership-payments/square-payment'
import {
  parsePromotionSelection,
  type ResolvedPromotion,
} from '@/domains/membership-promotions/schema'
import {
  insertMembershipPromotionRedemption,
  resolveMembershipPromotion,
} from '@/domains/membership-promotions/service'
import { sendEmail } from '@/lib/email'
import { renewalWaiverRequiredEmail } from '@/lib/emails/membership'
import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { createHash, randomUUID } from 'node:crypto'
import type { RenewalDuration, RenewalTier } from './compute-renewal'
import { MAX_QUARTERS_AHEAD, RENEWAL_QUARTER, computeRenewal } from './compute-renewal'
import { parseQuestionnaire, tierForUwStatus } from './questionnaire'
import type { QuestionnaireAnswers } from './questionnaire'

function parseTier(v: unknown): RenewalTier {
  if (v === 'student' || v === 'nonstudent') return v
  throw new Error('Invalid tier')
}

function parseDuration(v: unknown): RenewalDuration {
  if (v === 'quarterly' || v === 'annual') return v
  throw new Error('Invalid duration')
}

const unknownPaymentOutcomeMessage =
  'We could not confirm whether your payment completed. If you received a receipt or see a charge, do not retry. Please contact the club.'

/** Current quarter and the logged-in member's ExpireQtr, with labels, for the renewal status line. */
export const getRenewalStatus = createServerFn({ method: 'GET' }).handler(async () => {
  const wycNumber = await requireAuth()

  const [cq] = await db
    .select({ quarter: lessonQuarter.quarter })
    .from(lessonQuarter)
    .where(eq(lessonQuarter.index, 1))
    .limit(1)
  const currentQuarter = cq.quarter

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
    console.error('getRenewalStatus: member not found for wycNumber', wycNumber)
    throw new Error('We could not find your membership record.')
  }
  const expireQtr = member.expireQtrIndex ?? 0

  const labels = await db.select({ index: quarters.index, school: quarters.school }).from(quarters)
  const labelFor = (idx: number) => labels.find((q) => q.index === idx)?.school ?? `quarter ${idx}`

  const [openRenewal] = await db
    .select({
      amountCents: membershipPayments.amountCents,
      approvalStatus: duesExemptionRequests.status,
      createdAt: membershipRenewals.createdAt,
      currency: membershipPayments.currency,
      duration: membershipRenewals.duration,
      id: membershipRenewals.id,
      source: membershipRenewals.source,
      targetExpireQtr: membershipRenewals.targetExpireQtr,
      waiverId: memberWaivers.id,
    })
    .from(membershipRenewals)
    .leftJoin(membershipPayments, eq(membershipPayments.renewalId, membershipRenewals.id))
    .leftJoin(memberWaivers, eq(memberWaivers.renewalId, membershipRenewals.id))
    .leftJoin(duesExemptionRequests, eq(duesExemptionRequests.renewalId, membershipRenewals.id))
    .where(
      and(
        eq(membershipRenewals.wycNumber, wycNumber),
        isNull(membershipRenewals.completedAt),
        isNull(membershipRenewals.closedAt),
      ),
    )
    .orderBy(desc(membershipRenewals.createdAt))
    .limit(1)

  const previewFor = (duration: RenewalDuration) => {
    const newExpireQtr = computeRenewal(expireQtr, duration)
    return {
      newExpireQtr,
      label: labelFor(newExpireQtr),
      allowed: newExpireQtr <= RENEWAL_QUARTER + MAX_QUARTERS_AHEAD,
    }
  }

  // Surface any open exemption request so the renew page can show pending state across reloads.
  const [openRequest] = await db
    .select({ requestedExpireQtr: duesExemptionRequests.requestedExpireQtr })
    .from(duesExemptionRequests)
    .where(
      and(
        eq(duesExemptionRequests.wycNumber, wycNumber),
        eq(duesExemptionRequests.status, 'pending'),
      ),
    )
    .limit(1)

  return {
    wycNumber,
    currentQuarter,
    currentQuarterLabel: labelFor(currentQuarter),
    expireQtr,
    expireQtrLabel: labelFor(expireQtr),
    member: {
      email: member.email ?? '',
      firstName: member.first ?? '',
      lastName: member.last ?? '',
    },
    isActive: expireQtr >= currentQuarter,
    preview: {
      quarterly: previewFor('quarterly'),
      annual: previewFor('annual'),
    },
    openRenewal: openRenewal
      ? {
          amountCents: openRenewal.amountCents ?? 0,
          approvalStatus: openRenewal.approvalStatus,
          createdAt: openRenewal.createdAt,
          currency: openRenewal.currency ?? 'USD',
          duration: openRenewal.duration,
          id: openRenewal.id,
          source: openRenewal.source,
          targetExpireQtr: openRenewal.targetExpireQtr,
          targetLabel: labelFor(openRenewal.targetExpireQtr),
          waiverComplete: openRenewal.waiverId !== null,
        }
      : null,
    exemptionRequest: openRequest
      ? {
          requestedExpireQtr: openRequest.requestedExpireQtr,
          label: labelFor(openRequest.requestedExpireQtr),
        }
      : null,
  }
})

/** Live price (cents) for a tier×duration, read from the Square catalog. */
export const getRenewalPrice = createServerFn({ method: 'GET' })
  .inputValidator((input: { tier: string; duration: string }) => ({
    tier: parseTier(input.tier),
    duration: parseDuration(input.duration),
  }))
  .handler(async ({ data }) => {
    await requireAuth()
    try {
      return await getMembershipPrice(data.tier, data.duration)
    } catch (error) {
      console.error('Failed to fetch renewal price:', error)
      throw new Error('Could not load the membership price')
    }
  })

async function recordPaidRenewal(input: {
  amountCents: number
  currency: string
  discountCents: number
  duration: RenewalDuration
  prevExpireQtr: number
  questionnaire: QuestionnaireAnswers
  promotion: ResolvedPromotion | null
  squareOrderId: string
  squarePaymentId: string
  targetExpireQtr: number
  tier: RenewalTier
  subtotalCents: number
  wycNumber: number
}) {
  const renewalId = randomUUID()
  await db.transaction(async (tx) => {
    await tx.insert(membershipRenewals).values({
      id: renewalId,
      wycNumber: input.wycNumber,
      source: 'paid',
      tier: input.tier,
      duration: input.duration,
      previousExpireQtr: input.prevExpireQtr,
      targetExpireQtr: input.targetExpireQtr,
    })
    const result = await tx.insert(membershipPayments).values({
      renewalId,
      wycNumber: input.wycNumber,
      squarePaymentId: input.squarePaymentId,
      squareOrderId: input.squareOrderId,
      amountCents: input.amountCents,
      currency: input.currency,
      tier: input.tier,
      duration: input.duration,
      prevExpireQtr: input.prevExpireQtr,
      newExpireQtr: input.targetExpireQtr,
      status: 'COMPLETED',
    })
    if (input.promotion) {
      await insertMembershipPromotionRedemption(tx, {
        discountCents: input.discountCents,
        finalCents: input.amountCents,
        paymentId: result[0].insertId,
        promotion: input.promotion,
        subtotalCents: input.subtotalCents,
      })
    }
    await tx.insert(renewalQuestionnaire).values({
      renewalId,
      wycNumber: input.wycNumber,
      quarter: input.targetExpireQtr,
      uwStatus: input.questionnaire.uwStatus,
      plusOneResponse: input.questionnaire.plusOneResponse,
      status: 'pending',
      source: 'paid',
    })
  })
  return renewalId
}

async function sendWaiverRequiredEmail(input: {
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
  if (!input.email) return { emailSent: false, emailSimulated: false, quarterLabel }

  try {
    const result = await sendEmail({
      to: input.email,
      subject: 'Complete your WYC renewal',
      text: renewalWaiverRequiredEmail(input.first ?? '', input.last ?? '', quarterLabel),
      idempotencyKey: `renewal-waiver-required/${input.renewalId}`,
    })
    return { emailSent: true, emailSimulated: result.simulated, quarterLabel }
  } catch (error) {
    console.error('sendWaiverRequiredEmail failed:', error)
    return { emailSent: false, emailSimulated: false, quarterLabel }
  }
}

/**
 * Self-service renewal: charge the member's card and record an open renewal that waits for its
 * member waiver. The session user is the member (requireAuth).
 */
export const payAndRenew = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: {
      duration: string
      promotion?: unknown
      sourceId: string
      questionnaire: unknown
    }) => ({
      duration: parseDuration(input.duration),
      promotion: parsePromotionSelection(input.promotion),
      sourceId: String(input.sourceId),
      answers: parseQuestionnaire(input.questionnaire),
    }),
  )
  .handler(async ({ data }) => {
    const wycNumber = await requireAuth()

    // Honor-system price tier comes from UW status; we never trust a client-sent tier.
    const tier = tierForUwStatus(data.answers.uwStatus)

    const [member] = await db
      .select({
        first: wycDatabase.first,
        last: wycDatabase.last,
        email: wycDatabase.email,
        expireQtrIndex: wycDatabase.expireQtrIndex,
      })
      .from(wycDatabase)
      .where(eq(wycDatabase.wycNumber, wycNumber))
    if (!member) {
      console.error('payAndRenew: member not found for wycNumber', wycNumber)
      throw new Error('We could not find your membership record.')
    }

    const [existingOpenRenewal] = await db
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
    if (existingOpenRenewal) {
      throw new Error('You already have a renewal in progress. Complete its waiver first.')
    }

    const prevExpireQtr = member.expireQtrIndex ?? 0
    const targetExpireQtr = computeRenewal(prevExpireQtr, data.duration)
    if (targetExpireQtr > RENEWAL_QUARTER + MAX_QUARTERS_AHEAD) {
      throw new Error(
        'Your membership is already paid as far ahead as we allow. Please renew again closer to your expiry date.',
      )
    }
    const promotion = data.promotion
      ? await getMembershipPrice(tier, data.duration).then((price) =>
          resolveMembershipPromotion({
            audience: 'renewals',
            code: data.promotion!.code,
            currency: price.currency,
            expectedRevision: data.promotion!.revision,
            subtotalCents: price.amountCents,
          }),
        )
      : null
    // Orders computes the total from the catalog item.
    let order: Awaited<ReturnType<typeof createMembershipOrder>>
    try {
      order = await createMembershipOrder({
        discount: promotion,
        duration: data.duration,
        idempotencyKey: `renew-o/${wycNumber}/${targetExpireQtr}/${promotion?.index ?? 'none'}/${promotion?.revision ?? 0}`,
        tier,
      })
    } catch (error) {
      console.error('payAndRenew: Square order creation failed:', {
        wycNumber,
        targetExpireQtr,
        error,
      })
      throw new Error('We could not start your payment. Please try again.')
    }

    // Payments charges the order.
    let paymentId: string
    try {
      const payment = await chargeMembershipOrder({
        buyerEmail: member.email,
        idempotencyKey: `renew-p/${wycNumber}/${targetExpireQtr}/${createHash('sha256')
          .update(data.sourceId)
          .digest('hex')
          .slice(0, 16)}`,
        order,
        sourceId: data.sourceId,
      })
      paymentId = payment.id!
    } catch (error) {
      if (error instanceof MembershipPaymentError && error.kind === 'declined') {
        console.error('payAndRenew: Square declined payment:', {
          wycNumber,
          orderId: order.orderId,
          targetExpireQtr,
          error,
        })
        throw new Error(error.message)
      }

      if (error instanceof MembershipPaymentError && error.kind === 'unknown') {
        console.error('payAndRenew: Square payment outcome unknown:', {
          wycNumber,
          orderId: order.orderId,
          amountCents: order.amountCents,
          targetExpireQtr,
          error,
        })
        throw new Error(unknownPaymentOutcomeMessage)
      }

      console.error('payAndRenew: Square payment failed:', {
        wycNumber,
        orderId: order.orderId,
        targetExpireQtr,
        error,
      })
      throw new Error(
        error instanceof MembershipPaymentError
          ? error.message
          : 'We could not process your payment. Please try again.',
      )
    }

    // Payment is COMPLETED beyond this point — record the renewal.
    let renewalId: string
    try {
      renewalId = await recordPaidRenewal({
        wycNumber,
        tier,
        duration: data.duration,
        prevExpireQtr,
        targetExpireQtr,
        amountCents: order.amountCents,
        currency: order.currency,
        discountCents: order.discountCents,
        subtotalCents: order.subtotalCents,
        promotion,
        squarePaymentId: paymentId,
        squareOrderId: order.orderId,
        questionnaire: data.answers,
      })
    } catch (error) {
      // Charged at Square but our DB write failed — do NOT tell the member to pay again.
      console.error('payAndRenew: payment COMPLETED but DB update failed:', {
        wycNumber,
        paymentId,
        orderId: order.orderId,
        targetExpireQtr,
        error,
      })
      throw new Error(
        'Your payment went through, but we hit a problem updating your membership. ' +
          'Please contact the club — do not pay again.',
      )
    }

    const { emailSent, emailSimulated, quarterLabel } = await sendWaiverRequiredEmail({
      email: member.email,
      first: member.first,
      last: member.last,
      renewalId,
      targetExpireQtr,
    })

    return {
      success: true as const,
      renewalId,
      targetExpireQtr,
      quarterLabel,
      amountCents: order.amountCents,
      currency: order.currency,
      emailSent,
      emailSimulated,
    }
  })
