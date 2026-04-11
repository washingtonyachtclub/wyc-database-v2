import { and, count, desc, eq, gte, lte } from 'drizzle-orm'
import type { MySqlColumn, MySqlSelect } from 'drizzle-orm/mysql-core'
import { alias } from 'drizzle-orm/mysql-core'
import db from '@/db/index'
import { boatTypes, checkouts, ratings, wycDatabase } from '@/db/schema'
import type { CheckoutFilters } from './filter-types'

const skipperTable = alias(wycDatabase, 'skipper')

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

export function baseCheckoutsQuery(opts?: { wycNumber?: number; since?: string }) {
  const conditions = []
  if (opts?.wycNumber) conditions.push(eq(checkouts.wycNumber, opts.wycNumber))
  if (opts?.since) conditions.push(gte(checkouts.expectedReturn, opts.since))

  const query = db
    .select(checkoutSelectFields)
    .from(checkouts)
    .leftJoin(skipperTable, eq(checkouts.wycNumber, skipperTable.wycNumber))
    .leftJoin(boatTypes, eq(checkouts.boat, boatTypes.index))
    .$dynamic()

  if (conditions.length > 0) {
    query.where(and(...conditions))
  }

  query.orderBy(desc(checkouts.expectedReturn))

  return query
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
    .leftJoin(boatTypes, eq(checkouts.boat, boatTypes.index))
    .leftJoin(ratings, eq(checkouts.relevantRating, ratings.index))
}

export function baseAllCheckoutsCountQuery() {
  return db
    .select({ count: count() })
    .from(checkouts)
    .leftJoin(skipperTable, eq(checkouts.wycNumber, skipperTable.wycNumber))
    .leftJoin(boatTypes, eq(checkouts.boat, boatTypes.index))
    .leftJoin(ratings, eq(checkouts.relevantRating, ratings.index))
}

export const checkoutSortColumns: Record<string, MySqlColumn> = {
  index: checkouts.index,
  memberName: skipperTable.last,
  boatName: boatTypes.type,
  timeDeparture: checkouts.timeDeparture,
  expectedReturn: checkouts.expectedReturn,
  timeReturn: checkouts.timeReturn,
  ratingName: ratings.text,
}

export function withCheckoutFilters<T extends MySqlSelect>(
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
