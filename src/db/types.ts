import type { classType } from './schema'

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

export type MemberRating = {
  index: number
  member: number
  ratingIndex: number
  examiner: number
  ratingText: string
  ratingDegree: number
  date: string
  memberName: string
  examinerName: string
  comments: string
}

export type Officer = {
  index: number
  wycNumber: number
  memberName: string
  positionId: number
  positionName: string
  positionType: string
  isDuesExempt: boolean
  active: boolean
}

export type Checkout = {
  index: number
  wycNumber: number
  skipperName: string
  boatId: number
  boatName: string
  fleet: string
  destination: string
  departureDate: string
  departureTime: string
}

export type ChiefRole = {
  officerIndex: number
  name: string
}

export type ChiefTableRow = {
  wycNumber: number
  memberName: string
  chiefRoles: ChiefRole[]
}


export type ClassTypeRow = typeof classType.$inferSelect
export type ClassType = {
  index: number
  text: string
}
