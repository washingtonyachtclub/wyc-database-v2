import type { CheckoutQueryRow } from './checkout-queries'
import type { ChiefQueryRow } from './chief-queries'
import type { HonoraryQueryRow } from './honorary-queries'
import type { PrivilegeQueryRow } from './privilege-queries'
import type { LessonQueryRow } from './lesson-queries'
import type { LessonInsert, RichLesson } from './lesson-schema'
import type { MemberQueryRow } from './member-queries'
import type { MemberProfileUpdate } from './member-schema'
import type { OfficerQueryRow } from './officer-queries'
import type { RatingQueryRow } from './rating-queries'
import { boatTypes, wycDatabase } from './schema'
import { ratings } from './schema'
import type { BoatType, Checkout, Member, MemberRating, MemberTableRow, Officer, RatingType } from './types'

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

export function toCheckout(row: CheckoutQueryRow): Checkout {
  const timeDeparture = str(row.timeDeparture)
  return {
    index: row.index,
    wycNumber: row.wycNumber,
    skipperName: fullName(row.skipperFirst, row.skipperLast),
    boatId: num(row.boatId),
    boatName: str(row.boatName),
    fleet: str(row.fleet),
    destination: str(row.destination),
    departureDate: timeDeparture.slice(0, 10),
    departureTime: timeDeparture.slice(11, 16),
  }
}

export function toChiefRow(row: ChiefQueryRow) {
  return {
    officerIndex: row.index,
    wycNumber: num(row.wycNumber),
    memberName: fullName(row.memberFirst, row.memberLast),
    positionId: num(row.positionId),
    positionName: str(row.positionName),
  }
}

export function toHonoraryRow(row: HonoraryQueryRow) {
  return {
    officerIndex: row.officerIndex,
    wycNumber: num(row.wycNumber),
    memberName: fullName(row.memberFirst, row.memberLast),
    expireQtr: str(row.expireQtrSchoolText),
    expireQtrIndex: num(row.expireQtrIndex),
  }
}

export function toPrivilegeRow(row: PrivilegeQueryRow) {
  return {
    officerIndex: row.index,
    wycNumber: num(row.wycNumber),
    memberName: fullName(row.memberFirst, row.memberLast),
    positionId: num(row.positionId),
    positionName: str(row.positionName),
    outToSea: (row.outToSea ?? 0) !== 0,
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

export function toRatingType(row: typeof ratings.$inferSelect): RatingType {
  return {
    index: row.index,
    text: str(row.text),
    type: row.type,
    degree: row.degree,
    expires: row.expires !== 0,
  }
}

export function toBoatType(row: typeof boatTypes.$inferSelect): BoatType {
  return {
    index: row.index,
    type: str(row.type),
    description: row.description,
    fleet: row.fleet,
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
