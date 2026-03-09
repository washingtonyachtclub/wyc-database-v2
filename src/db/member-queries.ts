import { and, eq, gte, like, or } from 'drizzle-orm'
import type { MySqlColumn, MySqlSelect } from 'drizzle-orm/mysql-core'
import { wycDatabase } from './schema'

// Column ID → actual DB column for sorting
// 'expireQtrSchoolText' sorts by the raw int, not the display string
export const memberSortColumns: Record<string, MySqlColumn> = {
  expireQtrSchoolText: wycDatabase.expireQtr,
  joinDate: wycDatabase.joinDate,
  wycNumber: wycDatabase.wycNumber,
  first: wycDatabase.first,
  last: wycDatabase.last,
}

export const EXPIRE_QTR_MODES = ['exactly', 'atLeast'] as const
export type ExpireQtrMode = (typeof EXPIRE_QTR_MODES)[number]

export type ExpireQtrFilter = { quarter: number; mode: ExpireQtrMode }

export function parseExpireQtrMode(value: string): ExpireQtrMode | undefined {
  return (EXPIRE_QTR_MODES as readonly string[]).includes(value)
    ? (value as ExpireQtrMode)
    : undefined
}

export type MemberFilters = {
  wycId?: string
  name?: string
  category?: number
  expireQtrFilter?: ExpireQtrFilter
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
    const nameParts = filters.name
      .trim()
      .split(/\s+/)
      .filter((part) => part.length > 0)

    if (nameParts.length >= 2) {
      const firstNamePattern = `%${nameParts[0]}%`
      const lastNamePattern = `${nameParts.slice(1).join(' ')}%`
      conditions.push(
        and(
          like(wycDatabase.first, firstNamePattern),
          like(wycDatabase.last, lastNamePattern),
        )!,
      )
    } else if (nameParts.length === 1) {
      const namePattern = `%${nameParts[0]}%`
      conditions.push(
        or(
          like(wycDatabase.first, namePattern),
          like(wycDatabase.last, namePattern),
        ),
      )
    }
  }

  if (filters?.category !== undefined && filters.category !== null) {
    conditions.push(eq(wycDatabase.category, filters.category))
  }

  if (filters?.expireQtrFilter) {
    const { quarter, mode } = filters.expireQtrFilter
    if (mode === 'atLeast') {
      conditions.push(gte(wycDatabase.expireQtr, quarter))
    } else {
      conditions.push(eq(wycDatabase.expireQtr, quarter))
    }
  }

  if (conditions.length > 0) {
    qb.where(and(...conditions))
  }

  return qb
}
