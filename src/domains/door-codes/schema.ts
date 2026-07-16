import { z } from 'zod'
import { num, str } from '@/db/mapper-utils'
import type { doorCodes } from '@/db/schema'

// --- Zod schemas ---

export const doorCodeFormSchema = z.object({
  code: z.string().min(1, 'Code is required'),
})

export const doorCodeUpdateSchema = doorCodeFormSchema.extend({
  index: z.number(),
})

export type DoorCodeUpdateData = z.infer<typeof doorCodeUpdateSchema>

// --- Core types ---

export type DoorCode = {
  index: number
  slug: string
  name: string
  code: string
  updatedAt: string
  updatedBy: number
}

/** Locked entries carry no `code` field, so a component cannot render one the member lacks. */
export type DoorCodeEntry =
  | {
      index: number
      slug: string
      name: string
      unlocked: true
      code: string
      updatedAt: string
      updatedByName: string
    }
  | {
      index: number
      slug: string
      name: string
      unlocked: false
      requirement: string
    }

// --- Mappers ---

export function toDoorCode(row: typeof doorCodes.$inferSelect): DoorCode {
  return {
    index: row.index,
    slug: row.slug,
    name: row.name,
    code: row.code,
    updatedAt: str(row.updatedAt),
    updatedBy: num(row.updatedBy),
  }
}
