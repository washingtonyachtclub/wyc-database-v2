import { and, desc, eq, inArray } from 'drizzle-orm'
import { OFFICER_PAGE_TYPES } from '@/db/constants'
import db from '@/db/index'
import { officers, posType, positions, wycDatabase } from '@/db/schema'

export const officerSelectFields = {
  index: officers.index,
  wycNumber: wycDatabase.wycNumber,
  memberFirst: wycDatabase.first,
  memberLast: wycDatabase.last,
  positionId: positions.index,
  positionName: positions.name,
  positionTypeId: posType.index,
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

/** Officers page query — active positions of officer page types */
export function officerPageQuery() {
  return db
    .select(officerSelectFields)
    .from(officers)
    .leftJoin(wycDatabase, eq(officers.member, wycDatabase.wycNumber))
    .leftJoin(positions, eq(officers.position, positions.index))
    .leftJoin(posType, eq(positions.type, posType.index))
    .where(
      and(eq(positions.active, 1), inArray(posType.index, [...OFFICER_PAGE_TYPES])),
    )
    .orderBy(desc(officers.active))
}

/** Active positions for the officer page (dropdown + section grouping) */
export function getOfficerPagePositions() {
  return db
    .select({
      index: positions.index,
      name: positions.name,
      type: positions.type,
      typeName: posType.text,
    })
    .from(positions)
    .leftJoin(posType, eq(positions.type, posType.index))
    .where(
      and(eq(positions.active, 1), inArray(positions.type, [...OFFICER_PAGE_TYPES])),
    )
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
