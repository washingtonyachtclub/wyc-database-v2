import { SQUARE_LOCATION_ID, squareClient } from '@/lib/square'
import { SquareError, SquareTimeoutError } from 'square'
import type { Payment } from 'square'
import { variationId } from '../renewals/catalog'
import type { RenewalDuration, RenewalTier } from '../renewals/compute-renewal'

export type MembershipOrder = {
  amountCents: number
  currency: string
  orderId: string
}

export class MembershipPaymentError extends Error {
  constructor(
    message: string,
    readonly kind: 'declined' | 'failed' | 'unknown',
  ) {
    super(message)
  }
}

function declineMessage(error: any): string | null {
  const errors = error?.errors ?? error?.body?.errors
  if (!Array.isArray(errors) || errors.length === 0) return null
  const first = errors[0]
  if (first?.category !== 'PAYMENT_METHOD_ERROR' && first?.category !== 'CARD_ERROR') return null

  switch (first?.code) {
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

function isUnknownOutcome(error: unknown) {
  if (error instanceof SquareTimeoutError) return true
  if (!(error instanceof SquareError)) return true
  return error.statusCode === undefined || error.statusCode === 408 || error.statusCode >= 500
}

export async function getMembershipPrice(tier: RenewalTier, duration: RenewalDuration) {
  const response = await squareClient.catalog.object.get({ objectId: variationId(tier, duration) })
  const object = response.object
  const price = object?.type === 'ITEM_VARIATION' ? object.itemVariationData?.priceMoney : undefined
  if (!price?.amount) throw new Error('Square catalog variation has no price')
  return { amountCents: Number(price.amount), currency: price.currency ?? 'USD' }
}

export async function createMembershipOrder(input: {
  duration: RenewalDuration
  idempotencyKey: string
  tier: RenewalTier
}): Promise<MembershipOrder> {
  if (!SQUARE_LOCATION_ID) throw new Error('Square location is not configured')

  const response = await squareClient.orders.create({
    idempotencyKey: input.idempotencyKey,
    order: {
      locationId: SQUARE_LOCATION_ID,
      lineItems: [{ catalogObjectId: variationId(input.tier, input.duration), quantity: '1' }],
    },
  })
  const order = response.order
  if (!order?.id) throw new Error('Square returned no order id')

  return {
    amountCents: Number(order.totalMoney?.amount ?? 0n),
    currency: order.totalMoney?.currency ?? 'USD',
    orderId: order.id,
  }
}

export async function chargeMembershipOrder(input: {
  buyerEmail?: string | null
  idempotencyKey: string
  order: MembershipOrder
  sourceId: string
}): Promise<Payment> {
  if (!SQUARE_LOCATION_ID)
    throw new MembershipPaymentError('Payments are not configured.', 'failed')

  let payment: Payment | undefined
  try {
    const response = await squareClient.payments.create({
      amountMoney: {
        amount: BigInt(input.order.amountCents),
        currency: input.order.currency as any,
      },
      ...(input.buyerEmail ? { buyerEmailAddress: input.buyerEmail } : {}),
      idempotencyKey: input.idempotencyKey,
      locationId: SQUARE_LOCATION_ID,
      orderId: input.order.orderId,
      sourceId: input.sourceId,
    })
    payment = response.payment
  } catch (error) {
    console.error('Square membership payment request failed:', error)
    const decline = declineMessage(error)
    if (decline) throw new MembershipPaymentError(decline, 'declined')
    if (isUnknownOutcome(error)) {
      throw new MembershipPaymentError(
        'We could not confirm whether your payment completed.',
        'unknown',
      )
    }
    throw new MembershipPaymentError(
      'We could not process your payment. Please try again.',
      'failed',
    )
  }

  if (payment?.status === 'COMPLETED' && payment.id) return payment
  if (payment?.status === 'FAILED' || payment?.status === 'CANCELED') {
    throw new MembershipPaymentError('Your payment did not complete. Please try again.', 'failed')
  }
  throw new MembershipPaymentError(
    'We could not confirm whether your payment completed.',
    'unknown',
  )
}
