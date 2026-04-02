import { z } from 'zod'
import { str } from './mapper-utils'
import { ratings } from './schema'

// --- Zod schemas ---

export const ratingTypeInsertSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  type: z.string().min(1, 'Type is required'),
  degree: z.number({ error: 'Degree is required' }).min(0, 'Degree must be 0 or greater'),
  expires: z.boolean(),
})

export type RatingTypeInsertData = z.infer<typeof ratingTypeInsertSchema>

// --- Core types ---

export type RatingType = {
  index: number
  text: string
  type: string
  degree: number
  expires: boolean
}

// --- Mappers ---

export function toRatingType(row: typeof ratings.$inferSelect): RatingType {
  return {
    index: row.index,
    text: str(row.text),
    type: row.type,
    degree: row.degree,
    expires: row.expires !== 0,
  }
}
