import { z } from 'zod'
import { str } from '@/db/mapper-utils'
import { classType } from '@/db/schema'

// --- Zod schemas ---

export const lessonTypeInsertSchema = z.object({
  text: z.string().min(1, 'Lesson type name is required'),
})

export type LessonTypeInsertData = z.infer<typeof lessonTypeInsertSchema>

// --- Core types ---

export type LessonType = {
  index: number
  text: string
  usageCount: number
}

// --- Mappers ---

export function toLessonType(row: typeof classType.$inferSelect, usageCount = 0): LessonType {
  return {
    index: row.index,
    text: str(row.text),
    usageCount,
  }
}
