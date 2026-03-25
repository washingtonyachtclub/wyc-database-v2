import { z } from 'zod'

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
type LessonStudent = {
  wycNumber: number
  first: string
  last: string
  email: string
}
