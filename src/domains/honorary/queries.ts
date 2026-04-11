import { and, eq } from 'drizzle-orm'
import type { MySqlSelect } from 'drizzle-orm/mysql-core'
import db from '@/db/index'
import { officers, positions, quarters, wycDatabase } from '@/db/schema'

export const honorarySelectFields = {
  officerIndex: officers.index,
  wycNumber: wycDatabase.wycNumber,
  memberFirst: wycDatabase.first,
  memberLast: wycDatabase.last,
  expireQtrIndex: wycDatabase.expireQtrIndex,
  expireQtrSchoolText: quarters.school,
  outToSea: wycDatabase.outToSea,
}

export type HonoraryQueryRow = Awaited<ReturnType<typeof baseHonoraryQuery>>[number]

export function baseHonoraryQuery() {
  return db
    .select(honorarySelectFields)
    .from(officers)
    .leftJoin(wycDatabase, eq(officers.member, wycDatabase.wycNumber))
    .leftJoin(positions, eq(officers.position, positions.index))
    .leftJoin(quarters, eq(quarters.index, wycDatabase.expireQtrIndex))
}

export type HonoraryFilters = {
  showOutToSea?: boolean
}

export function withHonoraryFilters<T extends MySqlSelect>(
  qb: T,
  filters: HonoraryFilters | undefined,
) {
  const conditions = [eq(positions.index, 1030), eq(officers.active, 1)]

  if (!filters?.showOutToSea) {
    conditions.push(eq(wycDatabase.outToSea, 0))
  }

  qb.where(and(...conditions))
  return qb
}
