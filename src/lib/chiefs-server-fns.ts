import { createServerFn } from '@tanstack/react-start'
import {
  baseChiefsQuery,
  type ChiefFilters,
  getChiefPositions,
  withChiefFilters,
} from 'src/db/chief-queries'
import { toChiefRow } from 'src/db/mappers'
import type { ChiefTableRow } from 'src/db/types'
import { requirePrivilege } from '../lib/auth-middleware'

function formatChiefType(positionName: string, positionId: number): string {
  if (positionId === 3000) return 'Chief'
  return positionName.replace(/\s*Chief\s*$/, '').trim() || positionName
}

export const getChiefsTable = createServerFn({ method: 'GET' })
  .inputValidator(
    (input: {
      pageIndex: number
      pageSize: number
      filters?: ChiefFilters
    }) => ({
      pageIndex: input.pageIndex,
      pageSize: input.pageSize,
      filters: input.filters,
    }),
  )
  .handler(async ({ data }) => {
    await requirePrivilege('db')

    try {
      const { pageIndex, pageSize, filters } = data

      const query = baseChiefsQuery().$dynamic()
      withChiefFilters(query, filters)
      const rawRows = await query
      const mapped = rawRows.map(toChiefRow)

      // Group by member — one row per member with all their chief types
      const grouped = new Map<
        number,
        { memberName: string; positions: { id: number; name: string }[] }
      >()

      for (const row of mapped) {
        const existing = grouped.get(row.wycNumber)
        if (existing) {
          existing.positions.push({ id: row.positionId, name: row.positionName })
        } else {
          grouped.set(row.wycNumber, {
            memberName: row.memberName,
            positions: [{ id: row.positionId, name: row.positionName }],
          })
        }
      }

      // Convert to ChiefTableRow[], sorted by name
      const allChiefs: ChiefTableRow[] = Array.from(grouped.entries())
        .map(([wycNumber, { memberName, positions }]) => ({
          wycNumber,
          memberName,
          chiefTypes: positions.map((p) => formatChiefType(p.name, p.id)).join(', '),
        }))
        .sort((a, b) => a.memberName.localeCompare(b.memberName))

      // Paginate in TS (dataset is small enough)
      const totalCount = allChiefs.length
      const start = pageIndex * pageSize
      const pagedData = allChiefs.slice(start, start + pageSize)

      return { data: pagedData, totalCount }
    } catch (error) {
      console.error('Failed to fetch chiefs:', error)
      throw new Error('Failed to fetch chiefs')
    }
  })

export const getChiefTypes = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePrivilege('db')
  return await getChiefPositions()
})
