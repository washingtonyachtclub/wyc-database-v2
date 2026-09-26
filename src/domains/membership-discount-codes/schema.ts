import { z } from 'zod'

export const discountCodeAudienceSchema = z.enum(['new_members', 'renewals', 'both'])
export type DiscountCodeAudience = z.infer<typeof discountCodeAudienceSchema>

export const discountCodeSelectionSchema = z.object({
  code: z.string().trim().min(1).max(50),
  revision: z.number().int().positive(),
})
export type DiscountCodeSelection = z.infer<typeof discountCodeSelectionSchema>

export type DiscountCodeQuote = {
  code: string
  currency: string
  discountCents: number
  finalCents: number
  name: string
  revision: number
  subtotalCents: number
}

export type ResolvedDiscountCode = DiscountCodeQuote & {
  amountOffCents: number | null
  index: number
  percentageOff: number | null
}

export function normalizeDiscountCode(code: string): string {
  return code.trim().toUpperCase()
}

export function parseDiscountCodeSelection(input: unknown) {
  return input == null ? null : discountCodeSelectionSchema.parse(input)
}
