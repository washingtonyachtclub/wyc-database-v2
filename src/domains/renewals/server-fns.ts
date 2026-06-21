import db from '@/db/index'
import {
  duesExemptionRequests,
  lessonQuarter,
  membershipPayments,
  quarters,
  renewalQuestionnaire,
  wycDatabase,
} from '@/db/schema'
import { requireAuth, requirePrivilege } from '@/lib/auth/auth-middleware'
import { sendEmail } from '@/lib/email'
import { returningMemberEmail } from '@/lib/email-templates'
import { SQUARE_LOCATION_ID, squareClient } from '@/lib/square'
import { createServerFn } from '@tanstack/react-start'
import { and, eq } from 'drizzle-orm'
import { createHash } from 'node:crypto'
import { variationId } from './catalog'
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
    isActive: expireQtr >= currentQuarter,
    preview: {
      quarterly: previewFor('quarterly'),
      annual: previewFor('annual'),
    },
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

/** Bump ExpireQtr and log the payment row; throws so the caller can word the error. Questionnaire is best-effort. */
async function recordRenewal(input: {
  wycNumber: number
  tier: RenewalTier
  duration: RenewalDuration
  prevExpireQtr: number
  targetExpireQtr: number
  amountCents: number
  currency: string
  squarePaymentId: string | null
  squareOrderId: string | null
  questionnaire?: QuestionnaireAnswers
}): Promise<void> {
  await db
    .update(wycDatabase)
    .set({ expireQtrIndex: input.targetExpireQtr })
    .where(eq(wycDatabase.wycNumber, input.wycNumber))

  await db.insert(membershipPayments).values({
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

  if (input.questionnaire) {
    try {
      await db.insert(renewalQuestionnaire).values({
        wycNumber: input.wycNumber,
        quarter: input.targetExpireQtr,
        uwStatus: input.questionnaire.uwStatus,
        plusOneResponse: input.questionnaire.plusOneResponse,
        status: 'active',
        source: 'paid',
      })
    } catch (error) {
      console.error('recordRenewal: failed to record questionnaire answers:', {
        wycNumber: input.wycNumber,
        error,
      })
    }
  }
}

/** Resolve the new ExpireQtr's label and send the renewal confirmation. Non-fatal: never throws. */
async function sendRenewalConfirmation(input: {
  member: { first: string | null; last: string | null; email: string | null }
  wycNumber: number
  targetExpireQtr: number
  recipients?: string | string[]
  mismatch?: { formEmail: string; onFileEmail: string }
}): Promise<{ emailSent: boolean; emailSimulated: boolean; quarterLabel: string }> {
  const [quarter] = await db
    .select({ school: quarters.school })
    .from(quarters)
    .where(eq(quarters.index, input.targetExpireQtr))
  const quarterLabel = quarter?.school ?? `quarter ${input.targetExpireQtr}`

  let emailSent = false
  let emailSimulated = false
  try {
    if (input.member.email) {
      const result = await sendEmail({
        to: input.recipients ?? input.member.email,
        subject: 'WYC Membership Renewed',
        text: returningMemberEmail(
          input.member.first ?? '',
          input.member.last ?? '',
          input.wycNumber,
          quarterLabel,
          input.mismatch,
        ),
        idempotencyKey: `renewal/${input.wycNumber}/${input.targetExpireQtr}`,
      })
      emailSent = true
      emailSimulated = result.simulated
    }
  } catch (emailError) {
    console.error('sendRenewalConfirmation: failed to send confirmation email:', emailError)
  }
  return { emailSent, emailSimulated, quarterLabel }
}

/**
 * Self-service renewal: charge the member's card, and only on a COMPLETED payment update
 * ExpireQtr, log the renewal, and email confirmation. The session user is the member (requireAuth).
 */
export const payAndRenew = createServerFn({ method: 'POST' })
  .inputValidator((input: { duration: string; sourceId: string; questionnaire: unknown }) => ({
    duration: parseDuration(input.duration),
    sourceId: String(input.sourceId),
    answers: parseQuestionnaire(input.questionnaire),
  }))
  .handler(async ({ data }) => {
    const wycNumber = await requireAuth()

    // Honor-system price tier comes from UW status; we never trust a client-sent tier.
    const tier = tierForUwStatus(data.answers.uwStatus)

    if (!SQUARE_LOCATION_ID) {
      console.error('SQUARE_LOCATION_ID is not configured')
      throw new Error('Payments are not configured. Please contact the club.')
    }

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
    const targetExpireQtr = computeRenewal(prevExpireQtr, data.duration)
    if (targetExpireQtr > RENEWAL_QUARTER + MAX_QUARTERS_AHEAD) {
      throw new Error(
        'Your membership is already paid as far ahead as we allow. Please renew again closer to your expiry date.',
      )
    }
    const variation = variationId(tier, data.duration)

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
        // Keyed on the single-use card nonce (hashed; Square caps the key at 45 chars) so a
        // genuine resubmit of the same nonce dedupes, but a fresh attempt (new card token)
        // gets a distinct key.
        idempotencyKey: `renew-p/${wycNumber}/${targetExpireQtr}/${createHash('sha256')
          .update(data.sourceId)
          .digest('hex')
          .slice(0, 16)}`,
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
      await recordRenewal({
        wycNumber,
        tier,
        duration: data.duration,
        prevExpireQtr,
        targetExpireQtr,
        amountCents,
        currency,
        squarePaymentId: paymentId,
        squareOrderId: orderId,
        questionnaire: data.answers,
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

    const { emailSent, emailSimulated, quarterLabel } = await sendRenewalConfirmation({
      member,
      wycNumber,
      targetExpireQtr,
    })

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

/** Record a renewal with no Square charge, for a member who paid outside the self-service flow (e.g. the new-member form). */
export const adminRecordRenewal = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: {
      wycNumber: number
      // The quarter paid for, taken from the form rather than recomputed.
      targetExpireQtr: number
      tier: string
      duration: string
      amountCents: number
      currency?: string
      squareOrderId?: string | null
      squarePaymentId?: string | null
      formEmail?: string
      sendEmail: boolean
    }) => {
      const amountCents = Math.round(Number(input.amountCents))
      if (!Number.isFinite(amountCents) || amountCents < 0) throw new Error('Invalid amount')
      const targetExpireQtr = Number(input.targetExpireQtr)
      if (!Number.isInteger(targetExpireQtr) || targetExpireQtr <= 0) {
        throw new Error('Invalid target quarter')
      }
      const trim = (v: string | null | undefined) => {
        const s = (v ?? '').trim()
        return s === '' ? null : s
      }
      return {
        wycNumber: Number(input.wycNumber),
        targetExpireQtr,
        tier: parseTier(input.tier),
        duration: parseDuration(input.duration),
        amountCents,
        currency: input.currency ?? 'USD',
        squareOrderId: trim(input.squareOrderId),
        squarePaymentId: trim(input.squarePaymentId),
        formEmail: (input.formEmail ?? '').trim(),
        sendEmail: input.sendEmail,
      }
    },
  )
  .handler(async ({ data }) => {
    await requirePrivilege('db')

    const [member] = await db
      .select({
        first: wycDatabase.first,
        last: wycDatabase.last,
        email: wycDatabase.email,
        expireQtrIndex: wycDatabase.expireQtrIndex,
      })
      .from(wycDatabase)
      .where(eq(wycDatabase.wycNumber, data.wycNumber))
    if (!member) {
      console.error('adminRecordRenewal: member not found for wycNumber', data.wycNumber)
      throw new Error('Member not found.')
    }

    const prevExpireQtr = member.expireQtrIndex ?? 0
    const targetExpireQtr = data.targetExpireQtr
    if (targetExpireQtr > RENEWAL_QUARTER + MAX_QUARTERS_AHEAD) {
      throw new Error('That renewal would push the member past the pre-pay limit.')
    }

    try {
      await recordRenewal({
        wycNumber: data.wycNumber,
        tier: data.tier,
        duration: data.duration,
        prevExpireQtr,
        targetExpireQtr,
        amountCents: data.amountCents,
        currency: data.currency,
        squarePaymentId: data.squarePaymentId,
        squareOrderId: data.squareOrderId,
      })
    } catch (error) {
      console.error('adminRecordRenewal: DB write failed:', {
        wycNumber: data.wycNumber,
        targetExpireQtr,
        error,
      })
      throw new Error('Failed to record the renewal.')
    }

    let emailSent = false
    let emailSimulated = false
    let emailAddress: string | null = null
    let quarterLabel: string
    if (data.sendEmail && member.email) {
      emailAddress = member.email
      const formEmailDiffers =
        data.formEmail !== '' && data.formEmail.toLowerCase() !== member.email.toLowerCase().trim()
      const res = await sendRenewalConfirmation({
        member,
        wycNumber: data.wycNumber,
        targetExpireQtr,
        recipients: formEmailDiffers ? [member.email, data.formEmail] : member.email,
        mismatch: formEmailDiffers
          ? { formEmail: data.formEmail, onFileEmail: member.email }
          : undefined,
      })
      emailSent = res.emailSent
      emailSimulated = res.emailSimulated
      quarterLabel = res.quarterLabel
    } else {
      const [quarter] = await db
        .select({ school: quarters.school })
        .from(quarters)
        .where(eq(quarters.index, targetExpireQtr))
      quarterLabel = quarter?.school ?? `quarter ${targetExpireQtr}`
    }

    return {
      success: true as const,
      wycNumber: data.wycNumber,
      newExpireQtr: targetExpireQtr,
      quarterLabel,
      emailSent,
      emailSimulated,
      emailAddress,
    }
  })
