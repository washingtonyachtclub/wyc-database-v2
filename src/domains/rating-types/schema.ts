import { z } from 'zod'
import { str } from '@/db/mapper-utils'
import { ratings } from '@/db/schema'

// --- Zod schemas ---

export const ratingTypeInsertSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  type: z.string().min(1, 'Type is required'),
  degree: z.number({ error: 'Degree is required' }).min(0, 'Degree must be 0 or greater'),
  expires: z.boolean(),
})

export const ratingTypeEditSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(50, 'Title must be 50 characters or fewer'),
  degree: ratingTypeInsertSchema.shape.degree.int().max(2147483647),
})

export const ratingTypeUpdateSchema = ratingTypeEditSchema.extend({ index: z.number().int() })

export type RatingTypeInsertData = z.infer<typeof ratingTypeInsertSchema>

// --- Core types ---

export type RatingType = {
  index: number
  text: string
  type: string
  degree: number
  expires: boolean
  usageCount: number
}

// --- Mappers ---

export function toRatingType(row: typeof ratings.$inferSelect, usageCount = 0): RatingType {
  return {
    index: row.index,
    text: str(row.text),
    type: row.type,
    degree: row.degree,
    expires: row.expires !== 0,
    usageCount,
  }
}
