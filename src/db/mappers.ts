import type { Member, MemberRow, MemberTableRow } from './types'

const str = (value: string | null | undefined): string => value ?? ''

const fallback = (value: string | null | undefined, def: string): string =>
  value ?? def

export function toMember(row: MemberRow): Member {
  return {
    wycNumber: row.wycNumber,
    first: str(row.first),
    last: str(row.last),
    email: str(row.email),
    categoryId: row.category ?? 0,
    expireQtr: row.expireQtr,
    joinDate: row.joinDate,
  }
}

export function toMemberTableRow(row: {
  wycNumber: number
  first: string | null
  last: string | null
  category: string | null
  expireQtrSchoolText: string | null
  expireQtrIndex: number
  joinDate: string
}): MemberTableRow {
  return {
    wycNumber: row.wycNumber,
    first: str(row.first),
    last: str(row.last),
    category: fallback(row.category, '<Unknown>'),
    expireQtrSchoolText: fallback(row.expireQtrSchoolText, '<Unknown>'),
    expireQtrIndex: row.expireQtrIndex,
    joinDate: row.joinDate,
  }
}
