import type { classType } from './schema'

export type MemberInsert = Omit<Member, 'wycNumber'>
export type Member = {
  wycNumber: number
  first: string
  last: string
  email: string
  categoryId: number | null
  expireQtrIndex: number
  streetAddress: string
  city: string
  state: string
  zipCode: string
  phone1: string
  phone2: string
  studentId: number | null
  outToSea: boolean
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

export type LessonInsert = Omit<Lesson, 'index'>
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

export type ClassTypeRow = typeof classType.$inferSelect
export type ClassType = {
  index: number
  text: string
}