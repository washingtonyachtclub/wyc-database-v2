import { and, desc, eq, gte } from 'drizzle-orm'
import { alias } from 'drizzle-orm/mysql-core'
import db from '@/db/index'
import { boatTypes, checkouts, wycDatabase } from '@/db/schema'

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
