import { desc, eq, inArray } from 'drizzle-orm'
import { OFFICER_PAGE_POSITIONS } from './constants'
import db from './index'
import { officers, posType, positions, wycDatabase } from './schema'

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
