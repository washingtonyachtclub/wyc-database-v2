import { z } from 'zod'
import { num, str } from '@/db/mapper-utils'

// --- Zod schemas ---

export const positionInsertSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.number({ error: 'Type is required' }).min(1, 'Type is required'),
})

export type PositionInsertData = z.infer<typeof positionInsertSchema>

// --- Core types ---

export type Position = {
  index: number
  name: string
  typeId: number
  typeName: string
  active: boolean
}

// --- Mappers ---

export function toPosition(row: {
  index: number
  name: string | null
  type: number | null
  typeName: string | null
  active: number
}): Position {
  return {
    index: row.index,
    name: str(row.name),
    typeId: num(row.type),
    typeName: row.typeName ?? '<Unknown>',
    active: row.active !== 0,
  }
}
