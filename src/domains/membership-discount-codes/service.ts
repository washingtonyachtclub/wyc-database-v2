import db from '@/db'
import { membershipDiscountCodeRedemptions, membershipDiscountCodes } from '@/db/schema'
import { getTodayPacificDateString } from '@/lib/date-utils'
import { count, eq } from 'drizzle-orm'
import {
  normalizeDiscountCode,
  type DiscountCodeAudience,
  type ResolvedDiscountCode,
} from './schema'

export async function resolveMembershipDiscountCode(input: {
  audience: Exclude<DiscountCodeAudience, 'both'>
  code: string
  currency: string
  expectedRevision?: number
  subtotalCents: number
}): Promise<ResolvedDiscountCode> {
  const code = normalizeDiscountCode(input.code)
  const [discountCode] = await db
    .select()
    .from(membershipDiscountCodes)
    .where(eq(membershipDiscountCodes.code, code))
    .limit(1)
  if (!discountCode || discountCode.active === 0)
    throw new Error('This discount code is not valid.')

  const today = getTodayPacificDateString()
  if (today < discountCode.startsOn || today > discountCode.endsOn) {
    throw new Error('This discount code is not active.')
  }
  if (discountCode.audience !== 'both' && discountCode.audience !== input.audience) {
    throw new Error('This discount code does not apply to this membership.')
  }
  if (input.expectedRevision !== undefined && discountCode.revision !== input.expectedRevision) {
    throw new Error('This discount changed. Apply the code again to review the updated total.')
  }
  if (discountCode.maxRedemptions !== null) {
    const [redemptions] = await db
      .select({ total: count() })
      .from(membershipDiscountCodeRedemptions)
      .where(eq(membershipDiscountCodeRedemptions.discountCodeId, discountCode.index))
    if (redemptions.total >= discountCode.maxRedemptions) {
      throw new Error('This discount code has reached its redemption limit.')
    }
  }

  let discountCents: number
  if (discountCode.percentageOff !== null) {
    discountCents = Math.round((input.subtotalCents * discountCode.percentageOff) / 100)
  } else {
    if (input.currency !== 'USD') throw new Error('This discount code is not available.')
    discountCents = discountCode.amountOffCents ?? 0
  }
  if (discountCents <= 0 || discountCents >= input.subtotalCents) {
    throw new Error('This discount cannot be applied to the selected membership.')
  }

  return {
    amountOffCents: discountCode.amountOffCents,
    code: discountCode.code,
    currency: input.currency,
    discountCents,
    finalCents: input.subtotalCents - discountCents,
    index: discountCode.index,
    name: discountCode.name,
    percentageOff: discountCode.percentageOff,
    revision: discountCode.revision,
    subtotalCents: input.subtotalCents,
  }
}

type DiscountCodeTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

export async function insertMembershipDiscountCodeRedemption(
  tx: DiscountCodeTransaction,
  input: {
    discountCents: number
    finalCents: number
    paymentId: number
    discountCode: ResolvedDiscountCode
    subtotalCents: number
  },
) {
  await tx.insert(membershipDiscountCodeRedemptions).values({
    amountOffCents: input.discountCode.amountOffCents,
    code: input.discountCode.code,
    discountCents: input.discountCents,
    finalCents: input.finalCents,
    paymentId: input.paymentId,
    percentageOff: input.discountCode.percentageOff,
    discountCodeId: input.discountCode.index,
    revision: input.discountCode.revision,
    subtotalCents: input.subtotalCents,
  })
}
