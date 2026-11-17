import { SQUARE_LOCATION_ID, squareClient } from '@/lib/square'
import { variationId } from '../renewals/catalog'
import type { RenewalDuration, RenewalTier } from '../renewals/compute-renewal'

export type MembershipOrder = {
  amountCents: number
  currency: string
  discountCents: number
  orderId: string
  subtotalCents: number
}

export type MembershipOrderDiscount = {
  amountOffCents: number | null
  currency: string
  name: string
  percentageOff: number | null
}

export async function getMembershipPrice(tier: RenewalTier, duration: RenewalDuration) {
  const response = await squareClient.catalog.object.get({ objectId: variationId(tier, duration) })
  const object = response.object
  const price = object?.type === 'ITEM_VARIATION' ? object.itemVariationData?.priceMoney : undefined
  if (!price?.amount) throw new Error('Square catalog variation has no price')
  return { amountCents: Number(price.amount), currency: price.currency ?? 'USD' }
}

export async function createMembershipOrder(input: {
  discount?: MembershipOrderDiscount | null
  duration: RenewalDuration
  idempotencyKey: string
  tier: RenewalTier
}): Promise<MembershipOrder> {
  if (!SQUARE_LOCATION_ID) throw new Error('Square location is not configured')

  const response = await squareClient.orders.create({
    idempotencyKey: input.idempotencyKey,
    order: {
      ...(input.discount && {
        discounts: [
          input.discount.percentageOff !== null
            ? {
                name: input.discount.name,
                percentage: String(input.discount.percentageOff),
                scope: 'ORDER' as const,
                type: 'FIXED_PERCENTAGE' as const,
                uid: 'membership-discount-code',
              }
            : {
                amountMoney: {
                  amount: BigInt(input.discount.amountOffCents ?? 0),
                  currency: input.discount.currency as any,
                },
                name: input.discount.name,
                scope: 'ORDER' as const,
                type: 'FIXED_AMOUNT' as const,
                uid: 'membership-discount-code',
              },
        ],
      }),
      locationId: SQUARE_LOCATION_ID,
      lineItems: [{ catalogObjectId: variationId(input.tier, input.duration), quantity: '1' }],
    },
  })
  const order = response.order
  if (!order?.id) throw new Error('Square returned no order id')

  const amountCents = Number(order.totalMoney?.amount ?? 0n)
  const discountCents = Number(order.totalDiscountMoney?.amount ?? 0n)
  return {
    amountCents,
    currency: order.totalMoney?.currency ?? 'USD',
    discountCents,
    orderId: order.id,
    subtotalCents: amountCents + discountCents,
  }
}

export {
  chargeSquareOrder as chargeMembershipOrder,
  SquarePaymentError as MembershipPaymentError,
} from '@/lib/square-payment'
