import { and, eq } from 'drizzle-orm'
import type { MySqlSelect } from 'drizzle-orm/mysql-core'
import db from '@/db/index'
import { officers, positions, posType, wycDatabase } from '@/db/schema'

export const privilegeSelectFields = {
  index: officers.index,
  wycNumber: wycDatabase.wycNumber,
  memberFirst: wycDatabase.first,
  memberLast: wycDatabase.last,
  positionId: positions.index,
  positionName: positions.name,
  outToSea: wycDatabase.outToSea,
  active: officers.active,
}

export type PrivilegeQueryRow = Awaited<ReturnType<typeof basePrivilegesQuery>>[number]

export function basePrivilegesQuery() {
  return db
    .select(privilegeSelectFields)
    .from(officers)
    .leftJoin(wycDatabase, eq(officers.member, wycDatabase.wycNumber))
    .leftJoin(positions, eq(officers.position, positions.index))
    .leftJoin(posType, eq(positions.type, posType.index))
}

export type PrivilegeFilters = {
  privilegeType?: number
}

export function withPrivilegeFilters<T extends MySqlSelect>(
  qb: T,
  filters: PrivilegeFilters | undefined,
) {
  const conditions = [
    eq(posType.index, 4), // always: only Type 4 positions
    eq(officers.active, 1), // always: only active officers
  ]

  if (filters?.privilegeType !== undefined) {
    conditions.push(eq(positions.index, filters.privilegeType))
  }

  qb.where(and(...conditions))
  return qb
}

/** Positions where type=4 -- populates the privilege type filter dropdown */
export function getPrivilegePositions() {
  return db
    .select({ index: positions.index, name: positions.name })
    .from(positions)
    .where(and(eq(positions.type, 4), eq(positions.active, 1)))
    .orderBy(positions.sortorder)
}
