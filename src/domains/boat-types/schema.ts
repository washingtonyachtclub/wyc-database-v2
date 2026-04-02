import { z } from 'zod'
import { str } from './mapper-utils'
import { boatTypes } from './schema'

// --- Zod schemas ---

export const boatTypeInsertSchema = z.object({
  type: z.string().min(1, 'Type name is required'),
  description: z.string(),
  fleet: z.string().min(1, 'Fleet is required'),
})

export type BoatTypeInsertData = z.infer<typeof boatTypeInsertSchema>

// --- Core types ---

export type BoatType = {
  index: number
  type: string
  description: string
  fleet: string
}

// --- Mappers ---

export function toBoatType(row: typeof boatTypes.$inferSelect): BoatType {
  return {
    index: row.index,
    type: str(row.type),
    description: row.description,
    fleet: row.fleet,
  }
}
