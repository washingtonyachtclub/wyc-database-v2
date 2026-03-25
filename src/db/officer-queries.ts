import { desc, eq } from 'drizzle-orm'
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
