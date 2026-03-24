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

export type ClassTypeRow = typeof classType.$inferSelect
export type ClassType = {
  index: number
  text: string
}
