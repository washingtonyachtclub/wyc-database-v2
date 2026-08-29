import { z } from 'zod'
import { str } from '@/db/mapper-utils'
import { boatTypes } from '@/db/schema'

// --- Zod schemas ---

export const boatTypeInsertSchema = z.object({
  type: z.string().trim().min(1, 'Type name is required').max(80, 'Type is too long'),
  description: z.string().max(500, 'Description is too long'),
  fleet: z.string().trim().min(1, 'Fleet is required').max(80, 'Fleet is too long'),
})

export const boatTypeUpdateSchema = boatTypeInsertSchema.extend({
  index: z.number().int().positive(),
})

export const boatTypeActiveSchema = z.object({
  index: z.number().int().positive(),
  active: z.boolean(),
})

export type BoatTypeInsertData = z.infer<typeof boatTypeInsertSchema>
export type BoatTypeUpdateData = z.infer<typeof boatTypeUpdateSchema>

// --- Core types ---

export type BoatType = {
  index: number
  type: string
  description: string
  fleet: string
  active: boolean
  usageCount: number
}

// --- Mappers ---

export function toBoatType(row: typeof boatTypes.$inferSelect, usageCount = 0): BoatType {
  return {
    index: row.index,
    type: str(row.type),
    description: row.description,
    fleet: row.fleet,
    active: row.active !== 0,
    usageCount,
  }
}
