import { z } from 'zod'
import { str } from '@/db/mapper-utils'
import { quarters } from '@/db/schema'

// --- Zod schemas ---

export const quarterInsertSchema = z.object({
  text: z.string().min(1, 'Quarter name is required'),
  school: z.string().min(1, 'School name is required'),
  endDate: z.string().min(1, 'End date is required'),
})

export type QuarterInsertData = z.infer<typeof quarterInsertSchema>

// --- Core types ---

export type Quarter = {
  index: number
  text: string
  school: string
  endDate: string
}

// --- Mappers ---

export function toQuarter(row: typeof quarters.$inferSelect): Quarter {
  return {
    index: row.index,
    text: str(row.text),
    school: str(row.school),
    endDate: str(row.endDate),
  }
}
