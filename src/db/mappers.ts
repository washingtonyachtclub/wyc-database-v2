import type { LessonQueryRow } from './lesson-queries'
import type { LessonInsert, RichLesson } from './lesson-schema'
import type { MemberQueryRow } from './member-queries'
import type { OfficerQueryRow } from './officer-queries'
import type { RatingQueryRow } from './rating-queries'
import { wycDatabase } from './schema'
import type { Member, MemberInsert, MemberRating, MemberTableRow, Officer } from './types'

const num = (value: number | null | undefined): number => value ?? 0
const str = (value: string | null | undefined): string => value ?? ''

function fullName(first: string | null | undefined, last: string | null | undefined): string {
  return [first?.trim(), last?.trim()].filter(Boolean).join(' ')
}

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

export function fromMemberInsert(data: MemberInsert): typeof wycDatabase.$inferInsert {
  return {
    ...data,
    outToSea: data.outToSea ? 1 : 0,
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

export function toOfficer(row: OfficerQueryRow): Officer {
  return {
    index: row.index,
    wycNumber: num(row.wycNumber),
    memberName: fullName(row.memberFirst, row.memberLast),
    positionId: num(row.positionId),
    positionName: str(row.positionName),
    positionType: row.positionType ?? '<Unknown>',
    isDuesExempt: (row.isDuesExempt ?? 0) !== 0,
    active: row.active !== 0,
  }
}

export function toMemberRating(row: RatingQueryRow): MemberRating {
  return {
    index: row.index,
    ratingText: str(row.ratingText),
    ratingDegree: num(row.ratingDegree),
    date: str(row.date),
    memberName: fullName(row.memberFirst, row.memberLast),
    examinerName: fullName(row.examinerFirst, row.examinerLast),
    comments: str(row.comments),
  }
}
