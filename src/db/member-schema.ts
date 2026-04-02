import { z } from 'zod'
import type { MemberQueryRow } from './member-queries'
import { num, str, fullName } from './mapper-utils'
import type { RatingQueryRow } from './rating-queries'
import { wycDatabase } from './schema'

// --- Zod schemas ---

const MemberFieldsSchema = z.object({
  last: z.string().min(1, 'Last name is required'),
  first: z.string().min(1, 'First name is required'),
  streetAddress: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  phone1: z.string(),
  phone2: z.string(),
  email: z.email('Invalid email address'),
  categoryId: z.number().nullable(),
  expireQtrIndex: z.number(),
  studentId: z.number().nullable(),
  outToSea: z.boolean(),
})

export const CreateMemberSchema = MemberFieldsSchema
export type CreateMember = z.infer<typeof CreateMemberSchema>

export const MemberProfileUpdateSchema = MemberFieldsSchema
export type MemberProfileUpdate = z.infer<typeof MemberProfileUpdateSchema>

// --- Core & display types ---

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
  ratingExpires: boolean
  date: string
  memberName: string
  examinerName: string
  comments: string
}

// --- Mappers ---

export function toMember(row: typeof wycDatabase.$inferSelect): Member {
  return {
    wycNumber: row.wycNumber,
    first: str(row.first),
    last: str(row.last),
    email: str(row.email),
    categoryId: row.categoryId ?? null,
    expireQtrIndex: row.expireQtrIndex,
    streetAddress: str(row.streetAddress),
    city: str(row.city),
    state: str(row.state),
    zipCode: str(row.zipCode),
    phone1: str(row.phone1),
    phone2: str(row.phone2),
    studentId: row.studentId ?? null,
    outToSea: (row.outToSea ?? 0) !== 0,
    joinDate: row.joinDate,
  }
}

export function toMemberTableRow(row: MemberQueryRow): MemberTableRow {
  return {
    wycNumber: row.wycNumber,
    first: str(row.first),
    last: str(row.last),
    category: row.category ?? '<Unknown>',
    expireQtrSchoolText: row.expireQtrSchoolText ?? '<Unknown>',
    expireQtrIndex: row.expireQtrIndex,
    joinDate: row.joinDate,
  }
}

export function fromMemberInsert(data: MemberProfileUpdate): typeof wycDatabase.$inferInsert {
  return {
    ...data,
    outToSea: data.outToSea ? 1 : 0,
  }
}

export function toMemberRating(row: RatingQueryRow): MemberRating {
  return {
    index: row.index,
    member: num(row.member),
    ratingIndex: num(row.ratingIndex),
    examiner: num(row.examiner),
    ratingText: str(row.ratingText),
    ratingDegree: num(row.ratingDegree),
    ratingExpires: (row.ratingExpires ?? 0) !== 0,
    date: str(row.date),
    memberName: fullName(row.memberFirst, row.memberLast),
    examinerName: fullName(row.examinerFirst, row.examinerLast),
    comments: str(row.comments),
  }
}
