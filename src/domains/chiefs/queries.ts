import { and, eq } from 'drizzle-orm'
import db from '@/db/index'
import { officers, positions, posType, wycDatabase } from '@/db/schema'

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

/** Positions where type=3 — populates the chief type filter dropdown */
export function getChiefPositions() {
  return db
    .select({ index: positions.index, name: positions.name })
    .from(positions)
    .where(and(eq(positions.type, 3), eq(positions.active, 1)))
    .orderBy(positions.sortorder)
}
