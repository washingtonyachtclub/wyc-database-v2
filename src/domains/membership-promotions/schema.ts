import { z } from 'zod'

export const promotionAudienceSchema = z.enum(['new_members', 'renewals', 'both'])
export type PromotionAudience = z.infer<typeof promotionAudienceSchema>

export const promotionSelectionSchema = z.object({
  code: z.string().trim().min(1).max(50),
  revision: z.number().int().positive(),
})
export type PromotionSelection = z.infer<typeof promotionSelectionSchema>

export type PromotionQuote = {
  code: string
  currency: string
  discountCents: number
  finalCents: number
  name: string
  revision: number
  subtotalCents: number
}

export type ResolvedPromotion = PromotionQuote & {
  amountOffCents: number | null
  index: number
  percentageOff: number | null
}

export function normalizePromotionCode(code: string): string {
  return code.trim().toUpperCase()
}

export function parsePromotionSelection(input: unknown) {
  return input == null ? null : promotionSelectionSchema.parse(input)
}
