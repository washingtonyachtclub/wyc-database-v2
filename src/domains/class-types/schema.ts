import { z } from 'zod'
import { str } from '@/db/mapper-utils'
import { classType } from '@/db/schema'

// --- Zod schemas ---

export const classTypeInsertSchema = z.object({
  text: z.string().min(1, 'Lesson type name is required'),
})

export type ClassTypeInsertData = z.infer<typeof classTypeInsertSchema>

// --- Core types ---

export type ClassType = {
  index: number
  text: string
}

// --- Mappers ---

export function toClassType(row: typeof classType.$inferSelect): ClassType {
  return {
    index: row.index,
    text: str(row.text),
  }
}
