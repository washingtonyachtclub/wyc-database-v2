import { eq } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import {
  basePrivilegesQuery,
  type PrivilegeFilters,
  getPrivilegePositions,
  withPrivilegeFilters,
} from 'src/db/privilege-queries'
import db from 'src/db'
import { toPrivilegeRow } from 'src/db/privilege-schema'
import type { PrivilegeTableRow } from 'src/db/privilege-schema'
import { officers } from 'src/db/schema'
import { requirePrivilege } from '../lib/auth-middleware'

export const getPrivilegesTable = createServerFn({ method: 'GET' })
  .inputValidator(
    (input: { filters?: PrivilegeFilters }) => ({
      filters: input.filters,
    }),
  )
  .handler(async ({ data }) => {
    await requirePrivilege('db')

    try {
      const { filters } = data

      const query = basePrivilegesQuery().$dynamic()
      withPrivilegeFilters(query, filters)
      const rawRows = await query
      const mapped = rawRows.map(toPrivilegeRow)

      // Group by member -- one row per member with all their roles
      const grouped = new Map<
        number,
        { memberName: string; outToSea: boolean; roles: { officerIndex: number; positionId: number; positionName: string }[] }
      >()

      for (const row of mapped) {
        const existing = grouped.get(row.wycNumber)
        const role = { officerIndex: row.officerIndex, positionId: row.positionId, positionName: row.positionName }
        if (existing) {
          existing.roles.push(role)
        } else {
          grouped.set(row.wycNumber, {
            memberName: row.memberName,
            outToSea: row.outToSea,
            roles: [role],
          })
        }
      }

      // Convert to PrivilegeTableRow[], sorted by name
      const result: PrivilegeTableRow[] = Array.from(grouped.entries())
        .map(([wycNumber, { memberName, outToSea, roles }]) => ({
          wycNumber,
          memberName,
          outToSea,
          roles: roles.map((r) => ({
            officerIndex: r.officerIndex,
            name: r.positionName,
          })),
        }))
        .sort((a, b) => a.memberName.localeCompare(b.memberName))

      return result
    } catch (error) {
      console.error('Failed to fetch privileges:', error)
      throw new Error('Failed to fetch privileges')
    }
  })

export const getPrivilegeTypes = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePrivilege('db')
  return await getPrivilegePositions()
})

export const deletePrivilege = createServerFn({ method: 'POST' })
  .inputValidator((input: { officerIndex: number }) => input)
  .handler(async ({ data: { officerIndex } }) => {
    await requirePrivilege('db')
    try {
      await db.delete(officers).where(eq(officers.index, officerIndex))
      return { success: true }
    } catch (error) {
      console.error('Failed to delete privilege:', error)
      throw new Error('Failed to delete privilege')
    }
  })
