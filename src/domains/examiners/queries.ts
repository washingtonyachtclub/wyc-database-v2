import { and, eq, gte, inArray } from 'drizzle-orm'
import type { MySqlSelect } from 'drizzle-orm/mysql-core'
import db from '@/db/index'
import { officers, positions, ratings, wycDatabase, wycRatings } from '@/db/schema'

export const examinerSelectFields = {
  officerIndex: officers.index,
  wycNumber: wycDatabase.wycNumber,
  memberFirst: wycDatabase.first,
  memberLast: wycDatabase.last,
  active: officers.active,
}

export type ExaminerQueryRow = Awaited<ReturnType<typeof baseExaminerQuery>>[number]

export function baseExaminerQuery() {
  return db
    .select(examinerSelectFields)
    .from(officers)
    .leftJoin(wycDatabase, eq(officers.member, wycDatabase.wycNumber))
    .leftJoin(positions, eq(officers.position, positions.index))
}

export type ExaminerFilters = {
  showInactive?: boolean
}

export function withExaminerFilters<T extends MySqlSelect>(
  qb: T,
  filters: ExaminerFilters | undefined,
) {
  const conditions = [eq(positions.index, 2240)]

  if (!filters?.showInactive) {
    conditions.push(eq(officers.active, 1))
  }

  qb.where(and(...conditions))
  return qb
}

export async function getSkipperRatingsForMembers(wycNumbers: number[]) {
  if (wycNumbers.length === 0) return []
  return db
    .select({ member: wycRatings.member, ratingText: ratings.text })
    .from(wycRatings)
    .innerJoin(ratings, eq(ratings.index, wycRatings.rating))
    .where(and(inArray(wycRatings.member, wycNumbers), gte(ratings.degree, 3)))
}
