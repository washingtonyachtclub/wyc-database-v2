import { eq } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import {
  baseChiefsQuery,
  type ChiefFilters,
  getChiefPositions,
  withChiefFilters,
} from 'src/db/chief-queries'
import { toChiefRow, type ChiefTableRow } from 'src/db/chiefs-schema'
import { officers } from 'src/db/schema'
import db from 'src/db'
import { requirePrivilege } from '../lib/auth-middleware'

function formatChiefType(positionName: string, positionId: number): string {
  if (positionId === 3000) return 'Chief'
  return positionName.replace(/\s*Chief\s*$/, '').trim() || positionName
}

export const getChiefsTable = createServerFn({ method: 'GET' })
  .inputValidator(
    (input: { filters?: ChiefFilters }) => ({
      filters: input.filters,
    }),
  )
  .handler(async ({ data }) => {
    await requirePrivilege('db')

    try {
      const { filters } = data

      const query = baseChiefsQuery().$dynamic()
      withChiefFilters(query, filters)
      const rawRows = await query
      const mapped = rawRows.map(toChiefRow)

      // Group by member — one row per member with all their chief roles
      const grouped = new Map<
        number,
        { memberName: string; roles: { officerIndex: number; positionId: number; positionName: string }[] }
      >()

      for (const row of mapped) {
        const existing = grouped.get(row.wycNumber)
        const role = { officerIndex: row.officerIndex, positionId: row.positionId, positionName: row.positionName }
        if (existing) {
          existing.roles.push(role)
        } else {
          grouped.set(row.wycNumber, {
            memberName: row.memberName,
            roles: [role],
          })
        }
      }

      // Convert to ChiefTableRow[], sorted by name
      const allChiefs: ChiefTableRow[] = Array.from(grouped.entries())
        .map(([wycNumber, { memberName, roles }]) => ({
          wycNumber,
          memberName,
          chiefRoles: roles.map((r) => ({
            officerIndex: r.officerIndex,
            name: formatChiefType(r.positionName, r.positionId),
          })),
        }))
        .sort((a, b) => a.memberName.localeCompare(b.memberName))

      return allChiefs
    } catch (error) {
      console.error('Failed to fetch chiefs:', error)
      throw new Error('Failed to fetch chiefs')
    }
  })

export const getChiefTypes = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePrivilege('db')
  return await getChiefPositions()
})

export const deleteChief = createServerFn({ method: 'POST' })
  .inputValidator((input: { officerIndex: number }) => input)
  .handler(async ({ data: { officerIndex } }) => {
    await requirePrivilege('db')
    try {
      await db.delete(officers).where(eq(officers.index, officerIndex))
      return { success: true }
    } catch (error) {
      console.error('Failed to delete chief:', error)
      throw new Error('Failed to delete chief')
    }
  })
