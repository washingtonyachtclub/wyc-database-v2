import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { variationId } from './catalog'
import { MAX_QUARTERS_AHEAD, computeRenewal } from './compute-renewal'
import type { RenewalDuration, RenewalTier } from './compute-renewal'
import db from '@/db/index'
import { lessonQuarter, membershipPayments, quarters, wycDatabase } from '@/db/schema'
import { requireAuth } from '@/lib/auth/auth-middleware'
import { sendEmail } from '@/lib/email'
import { returningMemberEmail } from '@/lib/email-templates'
import { SQUARE_LOCATION_ID, squareClient } from '@/lib/square'

function parseTier(v: unknown): RenewalTier {
  if (v === 'student' || v === 'nonstudent') return v
  throw new Error('Invalid tier')
}

function parseDuration(v: unknown): RenewalDuration {
  if (v === 'quarterly' || v === 'annual') return v
  throw new Error('Invalid duration')
}

/** Safe user-facing message for a card decline; null if it's not a card error (caller stays generic). */
function declineMessage(error: any): string | null {
  const errs = error?.errors ?? error?.body?.errors
  if (!Array.isArray(errs) || errs.length === 0) return null
  const e = errs[0]
  if (e?.category !== 'PAYMENT_METHOD_ERROR' && e?.category !== 'CARD_ERROR') return null
  switch (e?.code) {
    case 'CVV_FAILURE':
      return 'The card security code (CVV) was incorrect.'
    case 'ADDRESS_VERIFICATION_FAILURE':
      return 'The billing postal code did not match your card.'
    case 'EXPIRATION_FAILURE':
      return 'The card expiration date was invalid.'
    case 'INSUFFICIENT_FUNDS':
      return 'The card was declined for insufficient funds.'
    default:
      return 'Your card was declined. Please try a different card.'
  }
}

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
    .select({ expireQtrIndex: wycDatabase.expireQtrIndex })
    .from(wycDatabase)
    .where(eq(wycDatabase.wycNumber, wycNumber))
  if (!member) {
    console.error('getRenewalStatus: member not found for wycNumber', wycNumber)
    throw new Error('We could not find your membership record.')
  }
  const expireQtr = member.expireQtrIndex ?? 0

  const labels = await db.select({ index: quarters.index, school: quarters.school }).from(quarters)
  const labelFor = (idx: number) => labels.find((q) => q.index === idx)?.school ?? `quarter ${idx}`

  const previewFor = (duration: RenewalDuration) => {
    const newExpireQtr = computeRenewal(currentQuarter, expireQtr, duration)
    return {
      newExpireQtr,
      label: labelFor(newExpireQtr),
      allowed: newExpireQtr <= currentQuarter + MAX_QUARTERS_AHEAD,
    }
  }

  return {
    wycNumber,
    currentQuarter,
    currentQuarterLabel: labelFor(currentQuarter),
    expireQtr,
    expireQtrLabel: labelFor(expireQtr),
    isActive: expireQtr >= currentQuarter,
    preview: {
      quarterly: previewFor('quarterly'),
      annual: previewFor('annual'),
    },
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
      const res = await squareClient.catalog.object.get({
        objectId: variationId(data.tier, data.duration),
      })
      const obj = res.object
      const price = obj?.type === 'ITEM_VARIATION' ? obj.itemVariationData?.priceMoney : undefined
      if (!price?.amount) throw new Error('No price on variation')
      return { amountCents: Number(price.amount), currency: price.currency ?? 'USD' }
    } catch (error) {
      console.error('Failed to fetch renewal price:', error)
      throw new Error('Could not load the membership price')
    }
  })

/**
 * Self-service renewal: charge the member's card, and only on a COMPLETED payment update
 * ExpireQtr, log the renewal, and email confirmation. The session user is the member (requireAuth).
 */
export const payAndRenew = createServerFn({ method: 'POST' })
  .inputValidator((input: { tier: string; duration: string; sourceId: string }) => ({
    tier: parseTier(input.tier),
    duration: parseDuration(input.duration),
    sourceId: String(input.sourceId),
  }))
  .handler(async ({ data }) => {
    const wycNumber = await requireAuth()

    if (!SQUARE_LOCATION_ID) {
      console.error('SQUARE_LOCATION_ID is not configured')
      throw new Error('Payments are not configured. Please contact the club.')
    }

    // Read live: lesson_quarter.quarter gets corrected occasionally, so never cache it.
    const [cq] = await db
      .select({ quarter: lessonQuarter.quarter })
      .from(lessonQuarter)
      .where(eq(lessonQuarter.index, 1))
      .limit(1)
    const currentQuarter = cq.quarter

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

    const prevExpireQtr = member.expireQtrIndex ?? 0
    const targetExpireQtr = computeRenewal(currentQuarter, prevExpireQtr, data.duration)
    if (targetExpireQtr > currentQuarter + MAX_QUARTERS_AHEAD) {
      throw new Error(
        'Your membership is already paid as far ahead as we allow. Please renew again closer to your expiry date.',
      )
    }
    const variation = variationId(data.tier, data.duration)

    // Orders computes the total from the catalog item; Payments charges it.
    let orderId: string
    let paymentId: string
    let amountCents: number
    let currency: string
    try {
      const orderRes = await squareClient.orders.create({
        idempotencyKey: `renew-o/${wycNumber}/${targetExpireQtr}`,
        order: {
          locationId: SQUARE_LOCATION_ID,
          lineItems: [{ catalogObjectId: variation, quantity: '1' }],
        },
      })
      const order = orderRes.order
      if (!order?.id) throw new Error('Square returned no order id')
      amountCents = Number(order.totalMoney?.amount ?? 0n)
      currency = order.totalMoney?.currency ?? 'USD'

      const payRes = await squareClient.payments.create({
        idempotencyKey: `renew-p/${wycNumber}/${targetExpireQtr}`,
        sourceId: data.sourceId,
        orderId: order.id,
        amountMoney: { amount: BigInt(amountCents), currency: currency as any },
        locationId: SQUARE_LOCATION_ID,
        buyerEmailAddress: member.email ?? undefined,
      })
      const payment = payRes.payment
      if (payment?.status !== 'COMPLETED') {
        console.error('payAndRenew: payment not COMPLETED, status =', payment?.status)
        throw new Error('Your payment did not complete. Please try again.')
      }
      orderId = order.id
      paymentId = payment.id ?? ''
    } catch (error) {
      console.error('payAndRenew: Square charge failed:', error)
      throw new Error(
        declineMessage(error) ?? 'We could not process your payment. Please try again.',
      )
    }

    // Payment is COMPLETED beyond this point — record the renewal.
    try {
      await db
        .update(wycDatabase)
        .set({ expireQtrIndex: targetExpireQtr })
        .where(eq(wycDatabase.wycNumber, wycNumber))

      await db.insert(membershipPayments).values({
        wycNumber,
        squarePaymentId: paymentId,
        squareOrderId: orderId,
        amountCents,
        currency,
        tier: data.tier,
        duration: data.duration,
        prevExpireQtr,
        newExpireQtr: targetExpireQtr,
        status: 'COMPLETED',
      })
    } catch (error) {
      // Charged at Square but our DB write failed — do NOT tell the member to pay again.
      console.error('payAndRenew: payment COMPLETED but DB update failed:', {
        wycNumber,
        paymentId,
        orderId,
        targetExpireQtr,
        error,
      })
      throw new Error(
        'Your payment went through, but we hit a problem updating your membership. ' +
          'Please contact the club — do not pay again.',
      )
    }

    // Confirmation email — non-fatal.
    const [quarter] = await db
      .select({ school: quarters.school })
      .from(quarters)
      .where(eq(quarters.index, targetExpireQtr))
    const quarterLabel = quarter?.school ?? `quarter ${targetExpireQtr}`

    let emailSent = false
    let emailSimulated = false
    try {
      if (member.email) {
        const result = await sendEmail({
          to: member.email,
          subject: 'WYC Membership Renewed',
          text: returningMemberEmail(
            member.first ?? '',
            member.last ?? '',
            wycNumber,
            quarterLabel,
          ),
          idempotencyKey: `renewal/${wycNumber}/${targetExpireQtr}`,
        })
        emailSent = true
        emailSimulated = result.simulated
      }
    } catch (emailError) {
      console.error('payAndRenew: failed to send confirmation email:', emailError)
    }

    return {
      success: true as const,
      newExpireQtr: targetExpireQtr,
      quarterLabel,
      amountCents,
      currency,
      emailSent,
      emailSimulated,
    }
  })
