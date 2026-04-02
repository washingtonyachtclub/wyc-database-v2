import { z } from 'zod'
import type { LessonQueryRow } from './queries'
import { num, str, fullName } from '@/db/mapper-utils'
import type { classType } from '@/db/schema'

// --- Zod schemas ---

export const lessonInsertSchema = z.object({
  classTypeId: z.number({ error: 'Type is required' }).min(1, 'Type is required'),
  subtype: z.string().min(1, 'Title is required'),
  day: z.string().min(1, 'Day of week is required'),
  time: z.string().min(1, 'Time is required'),
  dates: z.string().min(1, 'Dates are required'),
  calendarDate: z.string().min(1, 'Calendar date is required'),
  instructor1: z.number(),
  instructor2: z.number().nullable(),
  comments: z.string(),
  size: z.number({ error: 'Size is required' }).int(),
  expire: z.number({ error: 'Expire quarter is required' }),
  display: z.boolean(),
})

export type LessonInsert = z.infer<typeof lessonInsertSchema>

// --- Core & display types ---

export type Lesson = {
  index: number
  classTypeId: number // classType index (FK)
  subtype: string
  day: string
  time: string
  dates: string
  calendarDate: string
  instructor1: number // wycNumber (FK)
  instructor2: number | null // wycNumber (FK)
  comments: string
  size: number
  expire: number // quarter index (FK)
  display: boolean
}
export type RichLesson = {
  index: number
  classTypeId: number // classType index
  instructor1: number
  instructor2: number | null
  expire: number // quarter index
  // resolved display fields
  type: string // classType.text
  subtype: string
  day: string
  time: string
  dates: string
  calendarDate: string
  instructor1Name: string
  instructor2Name: string
  comments: string
  size: number
  display: boolean
}
export type SignedUpLesson = RichLesson & {
  status: 'enrolled' | 'waitlisted'
  instructor1Email: string
  instructor2Email: string
}

export type LessonStudent = {
  wycNumber: number
  first: string
  last: string
  email: string
}

export type ClassTypeRow = typeof classType.$inferSelect
export type ClassType = {
  index: number
  text: string
}

// --- Mappers ---

export function toRichLesson(row: LessonQueryRow): RichLesson {
  return {
    index: row.index,
    classTypeId: num(row.typeId),
    instructor1: num(row.instructor1),
    instructor2: num(row.instructor2),
    expire: num(row.expire),
    type: row.type ?? '<Unknown>',
    subtype: str(row.subtype),
    day: str(row.day),
    time: str(row.time),
    dates: str(row.dates),
    calendarDate: row.calendarDate,
    instructor1Name: fullName(row.instructor1First, row.instructor1Last) || '<Unknown>',
    instructor2Name: fullName(row.instructor2First, row.instructor2Last),
    comments: str(row.comments),
    size: num(row.size),
    display: row.display !== 0,
  }
}

export function fromLessonInsert(data: LessonInsert) {
  const { classTypeId, ...rest } = data
  return {
    ...rest,
    type: classTypeId,
    display: data.display ? 1 : 0,
  }
}
