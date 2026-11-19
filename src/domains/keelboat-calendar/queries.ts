import { CATEGORY_IDS } from '@/domains/renewals/questionnaire'
import type { PricingTier } from './pricing'
import { alias } from 'drizzle-orm/pg-core'
import { and, asc, eq, gt, gte, inArray, isNull, lte } from 'drizzle-orm'
import db from '@/db/index'
import {
  calendarboats,
  calendarcomment,
  calendartable,
  officers,
  positions,
  ratings,
  wycDatabase,
  wycRatings,
} from '@/db/schema'
import { fullName, str } from '@/db/mapper-utils'
import { useRefreshedAppSession } from '@/lib/auth/session'
import { BOAT_ORDER, KEELBOAT_INSTRUCTION_POSITION, SNC_CHAIR_POSITION } from './calendar'
import { toBoat, toReservation } from './schema'

export async function getCalendarAccess() {
  const session = await useRefreshedAppSession()
  const memberId = session.data.userId
  if (!memberId)
    return {
      memberId: 0,
      canBook: false,
      isCalendarAdmin: false,
      phone: '',
      pricingTier: 'nonstudent' as PricingTier,
    }
  const [rating, position, member] = await Promise.all([
    db
      .select({ id: wycRatings.index })
      .from(wycRatings)
      .innerJoin(ratings, eq(wycRatings.rating, ratings.index))
      .where(and(eq(wycRatings.member, memberId), eq(ratings.type, 'KB'), gt(ratings.degree, 0)))
      .limit(1),
    db
      .select({ position: officers.position })
      .from(officers)
      .innerJoin(positions, eq(officers.position, positions.index))
      .where(
        and(
          eq(officers.member, memberId),
          inArray(officers.position, [KEELBOAT_INSTRUCTION_POSITION, SNC_CHAIR_POSITION]),
          eq(officers.active, 1),
          eq(positions.active, 1),
        ),
      ),
    db
      .select({ phone: wycDatabase.phone1, categoryId: wycDatabase.categoryId })
      .from(wycDatabase)
      .where(eq(wycDatabase.wycNumber, memberId))
      .limit(1),
  ])
  const isCalendarAdmin = (session.data.privileges ?? []).includes('db') || position.length > 0
  return {
    memberId,
    canBook: isCalendarAdmin || rating.length > 0,
    isCalendarAdmin,
    phone: str(member[0]?.phone),
    pricingTier: (member[0]?.categoryId === CATEGORY_IDS.student
      ? 'student'
      : 'nonstudent') as PricingTier,
  }
}

export async function readBoats() {
  const boats = (await db.select().from(calendarboats)).map(toBoat)
  return boats.sort((a, b) => {
    const order = (id: number) =>
      BOAT_ORDER.includes(id) ? BOAT_ORDER.indexOf(id) : BOAT_ORDER.length
    return order(a.id) - order(b.id) || a.name.localeCompare(b.name)
  })
}

export async function readAvailability(start: string, end: string) {
  const rows = await db
    .select({
      id: calendartable.id,
      boatId: calendartable.cBoatId,
      from: calendartable.reserveFrom,
      through: calendartable.reserveTo,
      kind: calendartable.reservationType,
      title: calendartable.title,
    })
    .from(calendartable)
    .where(
      and(
        isNull(calendartable.deletedAt),
        lte(calendartable.reserveFrom, `${end} 23:59:59`),
        gte(calendartable.reserveTo, `${start} 00:00:00`),
      ),
    )
    .orderBy(asc(calendartable.reserveFrom), asc(calendartable.id))
  return rows.map((row) => ({ ...row, title: row.kind === 'admin' ? str(row.title) : '' }))
}

export async function readReservation(id: number) {
  const creator = alias(wycDatabase, 'reservation_creator')
  const [row] = await db
    .select({
      reservation: calendartable,
      boat: calendarboats.name,
      first: wycDatabase.first,
      last: wycDatabase.last,
      creatorFirst: creator.first,
      creatorLast: creator.last,
    })
    .from(calendartable)
    .leftJoin(calendarboats, eq(calendartable.cBoatId, calendarboats.cBoatId))
    .leftJoin(wycDatabase, eq(calendartable.memberWycNumber, wycDatabase.wycNumber))
    .leftJoin(creator, eq(calendartable.createdByWycNumber, creator.wycNumber))
    .where(and(eq(calendartable.id, id), isNull(calendartable.deletedAt)))
    .limit(1)
  if (!row) return null
  const comments = await db
    .select({
      first: wycDatabase.first,
      last: wycDatabase.last,
      date: calendarcomment.date,
      comment: calendarcomment.comment,
    })
    .from(calendarcomment)
    .leftJoin(wycDatabase, eq(calendarcomment.userwyc, wycDatabase.wycNumber))
    .where(eq(calendarcomment.id, id))
    .orderBy(asc(calendarcomment.date))
  return {
    ...toReservation(row),
    comments: comments.map((c) => ({
      author: fullName(c.first, c.last),
      date: c.date,
      text: c.comment,
    })),
  }
}

export async function readReservationNames(start: string, end: string) {
  const rows = await db
    .select({
      id: calendartable.id,
      first: wycDatabase.first,
      last: wycDatabase.last,
      kind: calendartable.reservationType,
      title: calendartable.title,
    })
    .from(calendartable)
    .leftJoin(wycDatabase, eq(calendartable.memberWycNumber, wycDatabase.wycNumber))
    .where(
      and(
        isNull(calendartable.deletedAt),
        lte(calendartable.reserveFrom, `${end} 23:59:59`),
        gte(calendartable.reserveTo, `${start} 00:00:00`),
      ),
    )
  return rows.map((row) => ({
    id: row.id,
    name: row.kind === 'admin' ? str(row.title) || 'Admin' : str(row.last),
  }))
}
