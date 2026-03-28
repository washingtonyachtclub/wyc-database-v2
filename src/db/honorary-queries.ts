import { and, eq } from 'drizzle-orm'
import db from './index'
import { officers, positions, quarters, wycDatabase } from './schema'

export const honorarySelectFields = {
  officerIndex: officers.index,
  wycNumber: wycDatabase.wycNumber,
  memberFirst: wycDatabase.first,
  memberLast: wycDatabase.last,
  expireQtrIndex: wycDatabase.expireQtrIndex,
  expireQtrSchoolText: quarters.school,
}

export type HonoraryQueryRow = Awaited<ReturnType<typeof baseHonoraryQuery>>[number]

export function baseHonoraryQuery() {
  return db
    .select(honorarySelectFields)
    .from(officers)
    .leftJoin(wycDatabase, eq(officers.member, wycDatabase.wycNumber))
    .leftJoin(positions, eq(officers.position, positions.index))
    .leftJoin(quarters, eq(quarters.index, wycDatabase.expireQtrIndex))
    .where(
      and(
        eq(positions.index, 1030),
        eq(officers.active, 1),
      ),
    )
}
