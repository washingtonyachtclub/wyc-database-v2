import { sql, and, asc, count, eq, exists, gte, lte, or } from 'drizzle-orm'
import type { SQLiteColumn, SQLiteSelect } from 'drizzle-orm/sqlite-core'
import { alias } from 'drizzle-orm/sqlite-core'
import db from '@/db/index'
import { boatTypes, checkouts, crew, guests, ratings, wycDatabase } from '@/db/schema'
import type { CheckoutFilters } from './filter-types'

const skipperTable = alias(wycDatabase, 'skipper')
const supervisorTable = alias(wycDatabase, 'supervisor')

export const checkoutSelectFields = {
  index: checkouts.index,
  wycNumber: checkouts.wycNumber,
  skipperFirst: skipperTable.first,
  skipperLast: skipperTable.last,
  boatId: boatTypes.index,
  boatName: boatTypes.type,
  fleet: boatTypes.fleet,
  destination: checkouts.destination,
  timeDeparture: checkouts.timeDeparture,
  expectedReturn: checkouts.expectedReturn,
}

export type CheckoutQueryRow = Awaited<ReturnType<typeof baseCheckoutsQuery>>[number]

function memberCheckoutCondition(wycNumber: number) {
  return or(
    eq(checkouts.wycNumber, wycNumber),
    exists(
      db
        .select({ n: crew.index })
        .from(crew)
        .where(and(eq(crew.checkoutId, checkouts.index), eq(crew.crewId, wycNumber))),
    ),
  )
}

export function baseCheckoutsQuery(opts?: { wycNumber?: number; since?: string }) {
  const conditions = []
  if (opts?.wycNumber) {
    // Match checkouts the member skippered or crewed. exists() rather than a
    // join so a skipper listed in their own crew stays a single row.
    conditions.push(memberCheckoutCondition(opts.wycNumber))
  }
  if (opts?.since) conditions.push(gte(checkouts.expectedReturn, opts.since))

  const query = db
    .select(checkoutSelectFields)
    .from(checkouts)
    .leftJoin(skipperTable, eq(checkouts.wycNumber, skipperTable.wycNumber))
    .leftJoin(boatTypes, eq(checkouts.boat, sql`cast(${boatTypes.index} as text)`))
    .$dynamic()

  if (conditions.length > 0) {
    query.where(and(...conditions))
  }

  query.orderBy(sql`${checkouts.expectedReturn} desc nulls last`)

  return query
}

export const memberCheckoutExportSelectFields = {
  index: checkouts.index,
  wycNumber: checkouts.wycNumber,
  skipperFirst: skipperTable.first,
  skipperLast: skipperTable.last,
  boatReference: checkouts.boat,
  boatName: boatTypes.type,
  fleet: boatTypes.fleet,
  destination: checkouts.destination,
  timeDeparture: checkouts.timeDeparture,
  timeReturn: checkouts.timeReturn,
}

export type MemberCheckoutExportQueryRow = Awaited<
  ReturnType<typeof baseMemberCheckoutExportQuery>
>[number]

export function baseMemberCheckoutExportQuery(wycNumber: number) {
  return db
    .select(memberCheckoutExportSelectFields)
    .from(checkouts)
    .leftJoin(skipperTable, eq(checkouts.wycNumber, skipperTable.wycNumber))
    .leftJoin(
      boatTypes,
      or(
        eq(checkouts.boat, sql`cast(${boatTypes.index} as text)`),
        eq(checkouts.boat, boatTypes.type),
      ),
    )
    .where(memberCheckoutCondition(wycNumber))
    .orderBy(asc(checkouts.timeDeparture), asc(checkouts.index))
}

// --- Member-facing card queries (active + recently returned) ---

export const checkoutCardSelectFields = {
  index: checkouts.index,
  wycNumber: checkouts.wycNumber,
  skipperFirst: skipperTable.first,
  skipperLast: skipperTable.last,
  boatName: boatTypes.type,
  fleet: boatTypes.fleet,
  destination: checkouts.destination,
  timeDeparture: checkouts.timeDeparture,
  expectedReturn: checkouts.expectedReturn,
  timeReturn: checkouts.timeReturn,
  ratingName: ratings.text,
  supervisorFirst: supervisorTable.first,
  supervisorLast: supervisorTable.last,
}

export type CheckoutCardQueryRow = Awaited<ReturnType<typeof baseCheckoutCardsQuery>>[number]

export function baseCheckoutCardsQuery() {
  return db
    .select(checkoutCardSelectFields)
    .from(checkouts)
    .leftJoin(skipperTable, eq(checkouts.wycNumber, skipperTable.wycNumber))
    .leftJoin(boatTypes, eq(checkouts.boat, sql`cast(${boatTypes.index} as text)`))
    .leftJoin(ratings, eq(checkouts.relevantRating, ratings.index))
    .leftJoin(supervisorTable, eq(checkouts.chiefId, supervisorTable.wycNumber))
}

export async function findCheckout(index: number) {
  const [row] = await db.select().from(checkouts).where(eq(checkouts.index, index)).limit(1)
  return row
}

export function getCheckoutCrew(index: number) {
  return db
    .select({ wycNumber: crew.crewId, first: wycDatabase.first, last: wycDatabase.last })
    .from(crew)
    .leftJoin(wycDatabase, eq(crew.crewId, wycDatabase.wycNumber))
    .where(eq(crew.checkoutId, index))
    .orderBy(crew.index)
}

export function getCheckoutGuests(index: number) {
  return db.select().from(guests).where(eq(guests.checkoutId, index)).orderBy(guests.index)
}

// --- Table page queries (paginated, sortable, filterable) ---

export const checkoutTableSelectFields = {
  index: checkouts.index,
  wycNumber: checkouts.wycNumber,
  skipperFirst: skipperTable.first,
  skipperLast: skipperTable.last,
  boatName: boatTypes.type,
  fleet: boatTypes.fleet,
  timeDeparture: checkouts.timeDeparture,
  expectedReturn: checkouts.expectedReturn,
  timeReturn: checkouts.timeReturn,
  ratingName: ratings.text,
}

export type CheckoutTableQueryRow = Awaited<ReturnType<typeof baseAllCheckoutsQuery>>[number]

export function baseAllCheckoutsQuery() {
  return db
    .select(checkoutTableSelectFields)
    .from(checkouts)
    .leftJoin(skipperTable, eq(checkouts.wycNumber, skipperTable.wycNumber))
    .leftJoin(boatTypes, eq(checkouts.boat, sql`cast(${boatTypes.index} as text)`))
    .leftJoin(ratings, eq(checkouts.relevantRating, ratings.index))
}

export function baseAllCheckoutsCountQuery() {
  return db
    .select({ count: count() })
    .from(checkouts)
    .leftJoin(skipperTable, eq(checkouts.wycNumber, skipperTable.wycNumber))
    .leftJoin(boatTypes, eq(checkouts.boat, sql`cast(${boatTypes.index} as text)`))
    .leftJoin(ratings, eq(checkouts.relevantRating, ratings.index))
}

export const checkoutSortColumns: Record<string, SQLiteColumn> = {
  index: checkouts.index,
  memberName: skipperTable.last,
  boatName: boatTypes.type,
  timeDeparture: checkouts.timeDeparture,
  expectedReturn: checkouts.expectedReturn,
  timeReturn: checkouts.timeReturn,
  ratingName: ratings.text,
}

export function withCheckoutFilters<T extends SQLiteSelect>(
  qb: T,
  filters: CheckoutFilters | undefined,
) {
  const conditions = []

  if (filters?.boatId !== undefined) {
    conditions.push(eq(checkouts.boat, String(filters.boatId)))
  }
  if (filters?.fleet) {
    conditions.push(eq(boatTypes.fleet, filters.fleet))
  }
  if (filters?.memberWycNumber !== undefined) {
    conditions.push(eq(checkouts.wycNumber, filters.memberWycNumber))
  }
  if (filters?.since) {
    conditions.push(gte(checkouts.timeDeparture, filters.since))
  }
  if (filters?.until) {
    conditions.push(lte(checkouts.timeDeparture, filters.until + ' 23:59:59'))
  }

  if (conditions.length > 0) {
    qb.where(and(...conditions))
  }

  return qb
}
