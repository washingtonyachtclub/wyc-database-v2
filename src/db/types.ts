import type { wycDatabase } from './schema'

export type MemberRow = typeof wycDatabase.$inferSelect

export type Member = {
  wycNumber: number
  first: string
  last: string
  email: string
  categoryId: number
  expireQtr: number
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
