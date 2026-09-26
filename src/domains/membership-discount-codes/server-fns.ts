import db from '@/db'
import { membershipDiscountCodeRedemptions, membershipDiscountCodes } from '@/db/schema'
import { getMembershipPrice } from '@/domains/membership-payments/square-payment'
import type { RenewalDuration, RenewalTier } from '@/domains/renewals/compute-renewal'
import { requirePrivilege } from '@/lib/auth/auth-middleware'
import { getTodayPacificDateString } from '@/lib/date-utils'
import { createServerFn } from '@tanstack/react-start'
import { count, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { discountCodeAudienceSchema, normalizeDiscountCode } from './schema'
import { resolveMembershipDiscountCode } from './service'

const codeSchema = z
  .string()
  .trim()
  .min(1, 'Code is required')
  .max(50)
  .regex(/^[A-Za-z0-9_-]+$/, 'Use only letters, numbers, hyphens, and underscores')
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
  }, 'Enter a valid date')
const discountSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('percentage'), percentage: z.number().int().min(1).max(99) }),
  z.object({ type: z.literal('fixed'), amountCents: z.number().int().positive() }),
])
const editableFields = {
  audience: discountCodeAudienceSchema,
  discount: discountSchema,
  endsOn: dateSchema,
  maxRedemptions: z.number().int().positive().nullable(),
  name: z.string().trim().min(1).max(100),
  startsOn: dateSchema,
}
const createDiscountCodeSchema = z
  .object({
    ...editableFields,
    code: codeSchema,
  })
  .refine((input) => input.startsOn <= input.endsOn, {
    message: 'End date must be on or after the start date',
    path: ['endsOn'],
  })
const updateDiscountCodeSchema = z
  .object({
    ...editableFields,
    index: z.number().int().positive(),
  })
  .refine((input) => input.startsOn <= input.endsOn, {
    message: 'End date must be on or after the start date',
    path: ['endsOn'],
  })

function parseTier(value: unknown): RenewalTier {
  if (value === 'student' || value === 'nonstudent') return value
  throw new Error('Invalid membership tier')
}

function parseDuration(value: unknown): RenewalDuration {
  if (value === 'quarterly' || value === 'annual') return value
  throw new Error('Invalid membership duration')
}

function discountColumns(discount: z.infer<typeof discountSchema>) {
  return discount.type === 'percentage'
    ? { amountOffCents: null, percentageOff: discount.percentage }
    : { amountOffCents: discount.amountCents, percentageOff: null }
}

async function getRedemptionCount(discountCodeId: number) {
  const [result] = await db
    .select({ total: count() })
    .from(membershipDiscountCodeRedemptions)
    .where(eq(membershipDiscountCodeRedemptions.discountCodeId, discountCodeId))
  return result.total
}

export const listMembershipDiscountCodes = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePrivilege('db')
  try {
    const [discountCodes, redemptionCounts] = await Promise.all([
      db.select().from(membershipDiscountCodes).orderBy(membershipDiscountCodes.code),
      db
        .select({
          discountCodeId: membershipDiscountCodeRedemptions.discountCodeId,
          total: count(),
        })
        .from(membershipDiscountCodeRedemptions)
        .groupBy(membershipDiscountCodeRedemptions.discountCodeId),
    ])
    const counts = new Map(redemptionCounts.map((row) => [row.discountCodeId, row.total]))
    return discountCodes.map((discountCode) => ({
      ...discountCode,
      active: discountCode.active !== 0,
      redemptionCount: counts.get(discountCode.index) ?? 0,
    }))
  } catch (error) {
    console.error('Failed to list membership discount codes:', error)
    throw new Error('Could not load discount codes')
  }
})

export const createMembershipDiscountCode = createServerFn({ method: 'POST' })
  .inputValidator((input: z.input<typeof createDiscountCodeSchema>) =>
    createDiscountCodeSchema.parse(input),
  )
  .handler(async ({ data }) => {
    const creator = await requirePrivilege('db')
    try {
      await db.insert(membershipDiscountCodes).values({
        ...discountColumns(data.discount),
        active: 1,
        audience: data.audience,
        code: normalizeDiscountCode(data.code),
        createdBy: creator,
        endsOn: data.endsOn,
        maxRedemptions: data.maxRedemptions,
        name: data.name,
        startsOn: data.startsOn,
      })
      return { success: true as const }
    } catch (error) {
      console.error('Failed to create membership discount code:', error)
      throw new Error('Could not create the discount code. Check that the code is unique.')
    }
  })

export const updateMembershipDiscountCode = createServerFn({ method: 'POST' })
  .inputValidator((input: z.input<typeof updateDiscountCodeSchema>) =>
    updateDiscountCodeSchema.parse(input),
  )
  .handler(async ({ data }) => {
    const editor = await requirePrivilege('db')
    let redemptionCount: number
    try {
      redemptionCount = await getRedemptionCount(data.index)
    } catch (error) {
      console.error('Failed to read membership discount code redemptions:', error)
      throw new Error('Could not update the discount code')
    }
    if (data.maxRedemptions !== null && data.maxRedemptions < redemptionCount) {
      throw new Error(`The redemption limit cannot be lower than ${redemptionCount}.`)
    }
    try {
      const result = await db
        .update(membershipDiscountCodes)
        .set({
          ...discountColumns(data.discount),
          audience: data.audience,
          endsOn: data.endsOn,
          maxRedemptions: data.maxRedemptions,
          name: data.name,
          revision: sql`${membershipDiscountCodes.revision} + 1`,
          startsOn: data.startsOn,
          updatedAt: new Date(),
          updatedBy: editor,
        })
        .where(eq(membershipDiscountCodes.index, data.index))
      if (result[0].affectedRows !== 1) throw new Error('Discount code not found')
      return { success: true as const }
    } catch (error) {
      console.error('Failed to update membership discount code:', error)
      throw new Error('Could not update the discount code')
    }
  })

export const setMembershipDiscountCodeActive = createServerFn({ method: 'POST' })
  .inputValidator((input: { active: boolean; index: number }) =>
    z.object({ active: z.boolean(), index: z.number().int().positive() }).parse(input),
  )
  .handler(async ({ data }) => {
    const editor = await requirePrivilege('db')
    if (data.active) {
      let discountCode: { endsOn: string; maxRedemptions: number | null } | undefined
      try {
        const rows = await db
          .select({
            endsOn: membershipDiscountCodes.endsOn,
            maxRedemptions: membershipDiscountCodes.maxRedemptions,
          })
          .from(membershipDiscountCodes)
          .where(eq(membershipDiscountCodes.index, data.index))
          .limit(1)
        discountCode = rows[0]
      } catch (error) {
        console.error('Failed to read membership discount code status:', error)
        throw new Error('Could not update the discount code')
      }
      if (!discountCode) throw new Error('Discount code not found')
      if (discountCode.endsOn < getTodayPacificDateString()) {
        throw new Error('Extend the end date before enabling this expired discount code.')
      }
      let redemptionLimitReached = false
      if (discountCode.maxRedemptions !== null) {
        try {
          redemptionLimitReached =
            (await getRedemptionCount(data.index)) >= discountCode.maxRedemptions
        } catch (error) {
          console.error('Failed to read membership discount code redemptions:', error)
          throw new Error('Could not update the discount code')
        }
      }
      if (redemptionLimitReached) {
        throw new Error(
          'Increase or remove the redemption limit before enabling this discount code.',
        )
      }
    }
    try {
      const result = await db
        .update(membershipDiscountCodes)
        .set({
          active: data.active ? 1 : 0,
          revision: sql`${membershipDiscountCodes.revision} + 1`,
          updatedAt: new Date(),
          updatedBy: editor,
        })
        .where(eq(membershipDiscountCodes.index, data.index))
      if (result[0].affectedRows !== 1) throw new Error('Discount code not found')
      return { success: true as const }
    } catch (error) {
      console.error('Failed to update membership discount code status:', error)
      throw new Error('Could not update the discount code')
    }
  })

export const getMembershipDiscountCodeQuote = createServerFn({ method: 'POST' })
  .inputValidator((input: { audience: string; code: string; duration: string; tier: string }) => ({
    audience: z.enum(['new_members', 'renewals']).parse(input.audience),
    code: codeSchema.parse(input.code),
    duration: parseDuration(input.duration),
    tier: parseTier(input.tier),
  }))
  .handler(async ({ data }) => {
    try {
      const price = await getMembershipPrice(data.tier, data.duration)
      return await resolveMembershipDiscountCode({
        audience: data.audience,
        code: data.code,
        currency: price.currency,
        subtotalCents: price.amountCents,
      })
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('This discount')) throw error
      console.error('Failed to quote membership discount code:', error)
      throw new Error('Could not apply the discount code')
    }
  })
