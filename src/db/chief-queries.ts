import { and, eq } from 'drizzle-orm'
import type { MySqlSelect } from 'drizzle-orm/mysql-core'
import db from './index'
import { officers, positions, posType, wycDatabase } from './schema'

export const chiefSelectFields = {
  index: officers.index,
  wycNumber: wycDatabase.wycNumber,
  memberFirst: wycDatabase.first,
  memberLast: wycDatabase.last,
  positionId: positions.index,
  positionName: positions.name,
  outToSea: wycDatabase.outToSea,
  active: officers.active,
}

export type ChiefQueryRow = Awaited<ReturnType<typeof baseChiefsQuery>>[number]

export function baseChiefsQuery() {
  return db
    .select(chiefSelectFields)
    .from(officers)
    .leftJoin(wycDatabase, eq(officers.member, wycDatabase.wycNumber))
    .leftJoin(positions, eq(officers.position, positions.index))
    .leftJoin(posType, eq(positions.type, posType.index))
}

export type ChiefFilters = {
  chiefType?: number
  showOutToSea?: boolean
}

export function withChiefFilters<T extends MySqlSelect>(
  qb: T,
  filters: ChiefFilters | undefined,
) {
  const conditions = [
    eq(posType.index, 3), // always: only chief positions
    eq(officers.active, 1), // always: only active officers
  ]

  if (filters?.chiefType !== undefined) {
    conditions.push(eq(positions.index, filters.chiefType))
  }

  if (!filters?.showOutToSea) {
    conditions.push(eq(wycDatabase.outToSea, 0))
  }

  qb.where(and(...conditions))
  return qb
}

/** Positions where type=3 — populates the chief type filter dropdown */
export function getChiefPositions() {
  return db
    .select({ index: positions.index, name: positions.name })
    .from(positions)
    .where(eq(positions.type, 3))
    .orderBy(positions.sortorder)
}
