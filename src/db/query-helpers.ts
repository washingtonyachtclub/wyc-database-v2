import { asc, desc } from 'drizzle-orm'
import type { MySqlColumn, MySqlSelect } from 'drizzle-orm/mysql-core'

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

export function withPagination<T extends MySqlSelect>(
  qb: T,
  pageIndex: number,
  pageSize: number,
) {
  qb.limit(pageSize).offset(pageIndex * pageSize)

  return qb
}
