import { wycDatabase } from 'drizzle/schema'
import type { LessonQueryRow } from './lesson-queries'
import type { LessonInsert, RichLesson } from './lesson-schema'
import type { MemberQueryRow } from './member-queries'
import type { MemberInsert, MemberTableRow } from './types'

const num = (value: number | null | undefined): number => value ?? 0
const str = (value: string | null | undefined): string => value ?? ''

function fullName(first: string | null | undefined, last: string | null | undefined): string {
  return [first?.trim(), last?.trim()].filter(Boolean).join(' ')
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
