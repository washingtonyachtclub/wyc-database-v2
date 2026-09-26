import db from '@/db'
import { membershipPromotionRedemptions, membershipPromotions } from '@/db/schema'
import { getMembershipPrice } from '@/domains/membership-payments/square-payment'
import type { RenewalDuration, RenewalTier } from '@/domains/renewals/compute-renewal'
import { requirePrivilege } from '@/lib/auth/auth-middleware'
import { createServerFn } from '@tanstack/react-start'
import { count, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { normalizePromotionCode, promotionAudienceSchema } from './schema'
import { resolveMembershipPromotion } from './service'

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
  audience: promotionAudienceSchema,
  discount: discountSchema,
  endsOn: dateSchema,
  name: z.string().trim().min(1).max(100),
  startsOn: dateSchema,
}
const createPromotionSchema = z
  .object({
    ...editableFields,
    code: codeSchema,
    maxRedemptions: z.number().int().positive().nullable(),
  })
  .refine((input) => input.startsOn <= input.endsOn, {
    message: 'End date must be on or after the start date',
    path: ['endsOn'],
  })
const updatePromotionSchema = z
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

export const listMembershipPromotions = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePrivilege('db')
  try {
    const [promotions, redemptionCounts] = await Promise.all([
      db.select().from(membershipPromotions).orderBy(membershipPromotions.code),
      db
        .select({ promotionId: membershipPromotionRedemptions.promotionId, total: count() })
        .from(membershipPromotionRedemptions)
        .groupBy(membershipPromotionRedemptions.promotionId),
    ])
    const counts = new Map(redemptionCounts.map((row) => [row.promotionId, row.total]))
    return promotions.map((promotion) => ({
      ...promotion,
      active: promotion.active !== 0,
      redemptionCount: counts.get(promotion.index) ?? 0,
    }))
  } catch (error) {
    console.error('Failed to list membership promotions:', error)
    throw new Error('Could not load discount codes')
  }
})

export const createMembershipPromotion = createServerFn({ method: 'POST' })
  .inputValidator((input: z.input<typeof createPromotionSchema>) =>
    createPromotionSchema.parse(input),
  )
  .handler(async ({ data }) => {
    const creator = await requirePrivilege('db')
    try {
      await db.insert(membershipPromotions).values({
        ...discountColumns(data.discount),
        active: 1,
        audience: data.audience,
        code: normalizePromotionCode(data.code),
        createdBy: creator,
        endsOn: data.endsOn,
        maxRedemptions: data.maxRedemptions,
        name: data.name,
        startsOn: data.startsOn,
      })
      return { success: true as const }
    } catch (error) {
      console.error('Failed to create membership promotion:', error)
      throw new Error('Could not create the discount code. Check that the code is unique.')
    }
  })

export const updateMembershipPromotion = createServerFn({ method: 'POST' })
  .inputValidator((input: z.input<typeof updatePromotionSchema>) =>
    updatePromotionSchema.parse(input),
  )
  .handler(async ({ data }) => {
    const editor = await requirePrivilege('db')
    try {
      const result = await db
        .update(membershipPromotions)
        .set({
          ...discountColumns(data.discount),
          audience: data.audience,
          endsOn: data.endsOn,
          name: data.name,
          revision: sql`${membershipPromotions.revision} + 1`,
          startsOn: data.startsOn,
          updatedAt: new Date(),
          updatedBy: editor,
        })
        .where(eq(membershipPromotions.index, data.index))
      if (result[0].affectedRows !== 1) throw new Error('Promotion not found')
      return { success: true as const }
    } catch (error) {
      console.error('Failed to update membership promotion:', error)
      throw new Error('Could not update the discount code')
    }
  })

export const setMembershipPromotionActive = createServerFn({ method: 'POST' })
  .inputValidator((input: { active: boolean; index: number }) =>
    z.object({ active: z.boolean(), index: z.number().int().positive() }).parse(input),
  )
  .handler(async ({ data }) => {
    const editor = await requirePrivilege('db')
    try {
      const result = await db
        .update(membershipPromotions)
        .set({
          active: data.active ? 1 : 0,
          revision: sql`${membershipPromotions.revision} + 1`,
          updatedAt: new Date(),
          updatedBy: editor,
        })
        .where(eq(membershipPromotions.index, data.index))
      if (result[0].affectedRows !== 1) throw new Error('Promotion not found')
      return { success: true as const }
    } catch (error) {
      console.error('Failed to update membership promotion status:', error)
      throw new Error('Could not update the discount code')
    }
  })

export const getMembershipPromotionQuote = createServerFn({ method: 'POST' })
  .inputValidator((input: { audience: string; code: string; duration: string; tier: string }) => ({
    audience: z.enum(['new_members', 'renewals']).parse(input.audience),
    code: codeSchema.parse(input.code),
    duration: parseDuration(input.duration),
    tier: parseTier(input.tier),
  }))
  .handler(async ({ data }) => {
    try {
      const price = await getMembershipPrice(data.tier, data.duration)
      return await resolveMembershipPromotion({
        audience: data.audience,
        code: data.code,
        currency: price.currency,
        subtotalCents: price.amountCents,
      })
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('This discount')) throw error
      console.error('Failed to quote membership promotion:', error)
      throw new Error('Could not apply the discount code')
    }
  })
