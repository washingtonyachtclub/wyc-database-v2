import type { lessons, wycDatabase } from './schema'

export type MemberRow = typeof wycDatabase.$inferSelect
export type LessonRow = typeof lessons.$inferSelect

export type Member = {
  wycNumber: number
  first: string
  last: string
  email: string
  categoryId: number
  expireQtrIndex: number
  joinDate: string
}

export type MemberTableRow = {
  wycNumber: number
  first: string
  last: string
  category: string // resolved name from memcat table
  expireQtrSchoolText: string // resolved name from quarters table (e.g. "Winter 2026")
  expireQtrIndex: number // raw quarter index, used for sorting
  joinDate: string
}

export type Lesson = {
  index: number
  classTypeId: number // classType index (FK)
  subtype: string
  day: string
  time: string
  dates: string
  calendarDate: string
  instructor1: number // wycNumber (FK)
  instructor2: number // wycNumber (FK)
  description: string
  size: number
  expire: number // quarter index (FK)
  display: boolean
}

export type LessonTableRow = {
  index: number
  // raw IDs — needed by the edit form
  typeId: number // classType index
  instructor1: number // wycNumber
  instructor2: number // wycNumber
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
  description: string
  size: number
  display: boolean
}
