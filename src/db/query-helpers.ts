import { and, sql, like, or, type SQL } from 'drizzle-orm'
import type { SQLiteColumn, SQLiteSelect } from 'drizzle-orm/sqlite-core'

/**
 * Builds LIKE conditions for a name search against first/last name columns.
 * Two+ words: first LIKE %word1%, last LIKE word2...%
 * One word: first LIKE %word% OR last LIKE %word%
 */
export function nameSearchCondition(
  firstCol: SQLiteColumn,
  lastCol: SQLiteColumn,
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

export function withSorting<T extends SQLiteSelect>(
  qb: T,
  sorting: { id: string; desc: boolean } | undefined,
  columnMap: Record<string, SQLiteColumn>,
  defaultColumn: SQLiteColumn,
) {
  const col = columnMap[sorting?.id ?? ''] ?? defaultColumn
  const isDescending = sorting?.desc ?? true // default desc (most recent first)

  qb.orderBy(isDescending ? sql`${col} desc nulls last` : sql`${col} asc nulls last`)

  return qb
}

export function withPagination<T extends SQLiteSelect>(qb: T, pageIndex: number, pageSize: number) {
  qb.limit(pageSize).offset(pageIndex * pageSize)

  return qb
}

// D1 limits bound parameters per statement; reports can select hundreds of IDs.
export function inIdList(column: SQLiteColumn, ids: readonly number[]) {
  return sql`${column} in (select value from json_each(${JSON.stringify(ids)}))`
}
