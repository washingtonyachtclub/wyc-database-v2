import { and, desc, eq, inArray } from 'drizzle-orm'
import { OFFICER_PAGE_POSITIONS } from '@/db/constants'
import db from '@/db/index'
import { officers, posType, positions, wycDatabase } from '@/db/schema'

export const officerSelectFields = {
  index: officers.index,
  wycNumber: wycDatabase.wycNumber,
  memberFirst: wycDatabase.first,
  memberLast: wycDatabase.last,
  positionId: positions.index,
  positionName: positions.name,
  positionType: posType.text,
  isDuesExempt: positions.isDuesExempt,
  active: officers.active,
}

export type OfficerQueryRow = Awaited<ReturnType<typeof baseOfficersQuery>>[number]

export function baseOfficersQuery() {
  return db
    .select(officerSelectFields)
    .from(officers)
    .leftJoin(wycDatabase, eq(officers.member, wycDatabase.wycNumber))
    .leftJoin(positions, eq(officers.position, positions.index))
    .leftJoin(posType, eq(positions.type, posType.index))
    .orderBy(desc(officers.active))
}

/** Officers page query — only positions matching the current org chart */
export function officerPageQuery() {
  return db
    .select(officerSelectFields)
    .from(officers)
    .leftJoin(wycDatabase, eq(officers.member, wycDatabase.wycNumber))
    .leftJoin(positions, eq(officers.position, positions.index))
    .leftJoin(posType, eq(positions.type, posType.index))
    .where(inArray(positions.index, [...OFFICER_PAGE_POSITIONS]))
    .orderBy(desc(officers.active))
}

/** Whitelisted positions for the officer page dropdown */
export function getOfficerPagePositions() {
  return db
    .select({ index: positions.index, name: positions.name })
    .from(positions)
    .where(inArray(positions.index, [...OFFICER_PAGE_POSITIONS]))
    .orderBy(positions.sortorder)
}

/** Look up the active officer holding a given position (e.g. Webmaster) */
export async function getActiveOfficerByPosition(positionId: number) {
  const rows = await db
    .select({
      first: wycDatabase.first,
      last: wycDatabase.last,
      email: wycDatabase.email,
    })
    .from(officers)
    .leftJoin(wycDatabase, eq(officers.member, wycDatabase.wycNumber))
    .leftJoin(positions, eq(officers.position, positions.index))
    .where(and(eq(positions.index, positionId), eq(officers.active, 1)))
    .limit(1)
  return rows[0] ?? null
}

export function baseMemberPositionsQuery(wycNumber: number) {
  return db
    .select(officerSelectFields)
    .from(officers)
    .leftJoin(wycDatabase, eq(officers.member, wycDatabase.wycNumber))
    .leftJoin(positions, eq(officers.position, positions.index))
    .leftJoin(posType, eq(positions.type, posType.index))
    .where(eq(officers.member, wycNumber))
    .orderBy(desc(officers.active))
}
