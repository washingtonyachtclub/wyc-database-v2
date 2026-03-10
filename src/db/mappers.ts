import { TBD_WYC_NUMBER } from './constants'
import type { ClassType, ClassTypeRow, Lesson, LessonInsert, LessonRow, LessonTableRow, Member, MemberRow, MemberTableRow } from './types'

const num = (value: number | null | undefined): number => value ?? 0
const str = (value: string | null | undefined): string => value ?? ''

function fullName(first: string | null | undefined, last: string | null | undefined): string {
  return [first?.trim(), last?.trim()].filter(Boolean).join(' ')
}

export function toMember(row: MemberRow): Member {
  return {
    wycNumber: row.wycNumber,
    first: str(row.first),
    last: str(row.last),
    email: str(row.email),
    categoryId: row.category,
    expireQtrIndex: row.expireQtr,
    joinDate: row.joinDate,
    streetAddress: str(row.streetAddress),
    city: str(row.city),
    state: str(row.state),
    zipCode: str(row.zipCode),
    phone1: str(row.phone1),
    phone2: str(row.phone2),
    studentId: row.studentId,
    outToSea: row.outToSea !== 0,
    imageName: str(row.imageName),
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
    category: row.category ?? '<Unknown>',
    expireQtrSchoolText: row.expireQtrSchoolText ?? '<Unknown>',
    expireQtrIndex: row.expireQtrIndex,
    joinDate: row.joinDate,
  }
}

export function toLesson(row: LessonRow): Lesson {
  return {
    index: row.index,
    classTypeId: row.type,
    subtype: str(row.subtype),
    day: str(row.day),
    time: str(row.time),
    dates: str(row.dates),
    calendarDate: row.calendarDate,
    instructor1: row.instructor1 ?? TBD_WYC_NUMBER,
    instructor2: row.instructor2 ?? TBD_WYC_NUMBER,
    description: row.description,
    size: num(row.size),
    expire: num(row.expire),
    display: row.display !== 0,
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

export function toLessonTableRow(row: {
  index: number
  typeId: number | null
  type: string | null
  subtype: string | null
  day: string | null
  time: string | null
  dates: string | null
  calendarDate: string
  instructor1: number | null
  instructor2: number | null
  instructor1First: string | null
  instructor1Last: string | null
  instructor2First: string | null
  instructor2Last: string | null
  description: string
  size: number | null
  expire: number | null
  display: number
}): LessonTableRow {
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
    description: row.description,
    size: num(row.size),
    display: row.display !== 0,
  }
}