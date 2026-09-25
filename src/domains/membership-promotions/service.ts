import db from '@/db'
import { membershipPromotionRedemptions, membershipPromotions } from '@/db/schema'
import { getTodayPacificDateString } from '@/lib/date-utils'
import { count, eq } from 'drizzle-orm'
import { normalizePromotionCode, type PromotionAudience, type ResolvedPromotion } from './schema'

export async function resolveMembershipPromotion(input: {
  audience: Exclude<PromotionAudience, 'both'>
  code: string
  currency: string
  expectedRevision?: number
  subtotalCents: number
}): Promise<ResolvedPromotion> {
  const code = normalizePromotionCode(input.code)
  const [promotion] = await db
    .select()
    .from(membershipPromotions)
    .where(eq(membershipPromotions.code, code))
    .limit(1)
  if (!promotion || promotion.active === 0) throw new Error('This discount code is not valid.')

  const today = getTodayPacificDateString()
  if (today < promotion.startsOn || today > promotion.endsOn) {
    throw new Error('This discount code is not active.')
  }
  if (promotion.audience !== 'both' && promotion.audience !== input.audience) {
    throw new Error('This discount code does not apply to this membership.')
  }
  if (input.expectedRevision !== undefined && promotion.revision !== input.expectedRevision) {
    throw new Error('This discount changed. Apply the code again to review the updated total.')
  }
  if (promotion.maxRedemptions !== null) {
    const [redemptions] = await db
      .select({ total: count() })
      .from(membershipPromotionRedemptions)
      .where(eq(membershipPromotionRedemptions.promotionId, promotion.index))
    if (redemptions.total >= promotion.maxRedemptions) {
      throw new Error('This discount code has reached its redemption limit.')
    }
  }

  let discountCents: number
  if (promotion.percentageOff !== null) {
    discountCents = Math.round((input.subtotalCents * promotion.percentageOff) / 100)
  } else {
    if (input.currency !== 'USD') throw new Error('This discount code is not available.')
    discountCents = promotion.amountOffCents ?? 0
  }
  if (discountCents <= 0 || discountCents >= input.subtotalCents) {
    throw new Error('This discount cannot be applied to the selected membership.')
  }

  return {
    amountOffCents: promotion.amountOffCents,
    code: promotion.code,
    currency: input.currency,
    discountCents,
    finalCents: input.subtotalCents - discountCents,
    index: promotion.index,
    name: promotion.name,
    percentageOff: promotion.percentageOff,
    revision: promotion.revision,
    subtotalCents: input.subtotalCents,
  }
}

type PromotionTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

export async function insertMembershipPromotionRedemption(
  tx: PromotionTransaction,
  input: {
    discountCents: number
    finalCents: number
    paymentId: number
    promotion: ResolvedPromotion
    subtotalCents: number
  },
) {
  await tx.insert(membershipPromotionRedemptions).values({
    amountOffCents: input.promotion.amountOffCents,
    code: input.promotion.code,
    discountCents: input.discountCents,
    finalCents: input.finalCents,
    paymentId: input.paymentId,
    percentageOff: input.promotion.percentageOff,
    promotionId: input.promotion.index,
    revision: input.promotion.revision,
    subtotalCents: input.subtotalCents,
  })
}
