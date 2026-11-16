import { and, sql, ilike, or, type SQL } from 'drizzle-orm'
import type { PgColumn, PgSelect } from 'drizzle-orm/pg-core'

/**
 * Builds LIKE conditions for a name search against first/last name columns.
 * Two+ words: first LIKE %word1%, last LIKE word2...%
 * One word: first LIKE %word% OR last LIKE %word%
 */
export function nameSearchCondition(
  firstCol: PgColumn,
  lastCol: PgColumn,
  name: string,
): SQL | undefined {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0)

  if (parts.length >= 2) {
    return and(ilike(firstCol, `%${parts[0]}%`), ilike(lastCol, `${parts.slice(1).join(' ')}%`))
  } else if (parts.length === 1) {
    const pattern = `%${parts[0]}%`
    return or(ilike(firstCol, pattern), ilike(lastCol, pattern))
  }

  return undefined
}

export function withSorting<T extends PgSelect>(
  qb: T,
  sorting: { id: string; desc: boolean } | undefined,
  columnMap: Record<string, PgColumn>,
  defaultColumn: PgColumn,
) {
  const col = columnMap[sorting?.id ?? ''] ?? defaultColumn
  const isDescending = sorting?.desc ?? true // default desc (most recent first)

  qb.orderBy(isDescending ? sql`${col} desc nulls last` : sql`${col} asc nulls last`)

  return qb
}

export function withPagination<T extends PgSelect>(qb: T, pageIndex: number, pageSize: number) {
  qb.limit(pageSize).offset(pageIndex * pageSize)

  return qb
}
