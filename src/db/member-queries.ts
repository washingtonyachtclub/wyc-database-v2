import { and, eq, gte } from 'drizzle-orm'
import type { MySqlColumn, MySqlSelect } from 'drizzle-orm/mysql-core'
import db from './index'
import type { MemberFilters } from './member-filter-types'
import { nameSearchCondition } from './query-helpers'
import { memcat, quarters, wycDatabase } from './schema'

export const memberTableSelectFields = {
  wycNumber: wycDatabase.wycNumber,
  first: wycDatabase.first,
  last: wycDatabase.last,
  category: memcat.text,
  expireQtrSchoolText: quarters.school,
  expireQtrIndex: wycDatabase.expireQtrIndex,
  joinDate: wycDatabase.joinDate,
}

export function baseMemberQuery() {
  return db
    .select(memberTableSelectFields)
    .from(wycDatabase)
    .leftJoin(memcat, eq(memcat.index, wycDatabase.categoryId))
    .leftJoin(quarters, eq(quarters.index, wycDatabase.expireQtrIndex))
}

export type MemberQueryRow = Awaited<ReturnType<typeof baseMemberQuery>>[number]

// Column ID → actual DB column for sorting
// 'expireQtrSchoolText' sorts by the raw int, not the display string
export const memberSortColumns: Record<string, MySqlColumn> = {
  expireQtrSchoolText: wycDatabase.expireQtrIndex,
  joinDate: wycDatabase.joinDate,
  wycNumber: wycDatabase.wycNumber,
  first: wycDatabase.first,
  last: wycDatabase.last,
}

export function withMemberFilters<T extends MySqlSelect>(
  qb: T,
  filters: MemberFilters | undefined,
) {
  const conditions = []

  if (filters?.wycId) {
    const wycIdNum = Number(filters.wycId)
    if (!isNaN(wycIdNum)) {
      conditions.push(eq(wycDatabase.wycNumber, wycIdNum))
    }
  }

  if (filters?.name) {
    const cond = nameSearchCondition(wycDatabase.first, wycDatabase.last, filters.name)
    if (cond) conditions.push(cond)
  }

  if (filters?.category !== undefined && filters.category !== null) {
    conditions.push(eq(wycDatabase.categoryId, filters.category))
  }

  if (filters?.expireQtrFilter) {
    const { quarter, mode } = filters.expireQtrFilter
    if (mode === 'atLeast') {
      conditions.push(gte(wycDatabase.expireQtrIndex, quarter))
    } else {
      conditions.push(eq(wycDatabase.expireQtrIndex, quarter))
    }
  }

  if (conditions.length > 0) {
    qb.where(and(...conditions))
  }

  return qb
}
