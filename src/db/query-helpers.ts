import { and, asc, desc, like, or, type SQL } from 'drizzle-orm'
import type { MySqlColumn, MySqlSelect } from 'drizzle-orm/mysql-core'

/**
 * Builds LIKE conditions for a name search against first/last name columns.
 * Two+ words: first LIKE %word1%, last LIKE word2...%
 * One word: first LIKE %word% OR last LIKE %word%
 */
export function nameSearchCondition(
  firstCol: MySqlColumn,
  lastCol: MySqlColumn,
  name: string,
): SQL | undefined {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0)

  if (parts.length >= 2) {
    return and(like(firstCol, `%${parts[0]}%`), like(lastCol, `${parts.slice(1).join(' ')}%`))
  } else if (parts.length === 1) {
    const pattern = `%${parts[0]}%`
    return or(like(firstCol, pattern), like(lastCol, pattern))
  }

  return undefined
}

export function withSorting<T extends MySqlSelect>(
  qb: T,
  sorting: { id: string; desc: boolean } | undefined,
  columnMap: Record<string, MySqlColumn>,
  defaultColumn: MySqlColumn,
) {
  const col = columnMap[sorting?.id ?? ''] ?? defaultColumn
  const isDescending = sorting?.desc ?? true // default desc (most recent first)

  qb.orderBy(isDescending ? desc(col) : asc(col))

  return qb
}

export function withPagination<T extends MySqlSelect>(qb: T, pageIndex: number, pageSize: number) {
  qb.limit(pageSize).offset(pageIndex * pageSize)

  return qb
}
