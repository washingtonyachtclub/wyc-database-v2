import type { classType, lessons, wycDatabase } from './schema'

export type MemberRow = typeof wycDatabase.$inferSelect

export type Member = {
  wycNumber: number
  first: string
  last: string
  email: string
  categoryId: number | null
  expireQtrIndex: number
  joinDate: string
  streetAddress: string
  city: string
  state: string
  zipCode: string
  phone1: string
  phone2: string
  studentId: number | null
  outToSea: boolean
  imageName: string
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

export type LessonRow = typeof lessons.$inferSelect
export type LessonInsert = Omit<Lesson, 'index'>

export type Lesson = {
  index: number
  classTypeId: number | null // classType index (FK)
  subtype: string
  day: string
  time: string
  dates: string
  calendarDate: string
  instructor1: number // wycNumber (FK)
  instructor2: number | null // wycNumber (FK)
  description: string
  size: number
  expire: number // quarter index (FK)
  display: boolean
}

export type LessonTableRow = {
  index: number
  classTypeId: number // classType index
  instructor1: number
  instructor2: number
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

export type ClassTypeRow = typeof classType.$inferSelect
export type ClassType = {
  index: number
  text: string
}