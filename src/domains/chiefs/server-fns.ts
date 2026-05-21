import { and, eq } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import { baseChiefsQuery, getChiefPositions } from '@/domains/chiefs/queries'
import { toChiefRow, type ChiefTableRow } from '@/domains/chiefs/schema'
import { officers, posType } from '@/db/schema'
import db from '@/db'
import { requireAuth, requirePrivilege } from '@/lib/auth/auth-middleware'

function formatChiefType(positionName: string, positionId: number): string {
  if (positionId === 3000) return 'Chief'
  return positionName.replace(/\s*Chief\s*$/, '').trim() || positionName
}

export const getChiefsTable = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAuth()

  try {
    const rawRows = await baseChiefsQuery().where(
      and(eq(posType.index, 3), eq(officers.active, 1)),
    )
    const mapped = rawRows.map(toChiefRow)

    const grouped = new Map<
      number,
      {
        memberName: string
        outToSea: boolean
        roles: { officerIndex: number; positionId: number; positionName: string }[]
      }
    >()

    for (const row of mapped) {
      const existing = grouped.get(row.wycNumber)
      const role = {
        officerIndex: row.officerIndex,
        positionId: row.positionId,
        positionName: row.positionName,
      }
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

    const allChiefs: ChiefTableRow[] = Array.from(grouped.entries())
      .map(([wycNumber, { memberName, outToSea, roles }]) => ({
        wycNumber,
        memberName,
        outToSea,
        chiefRoles: roles.map((r) => ({
          officerIndex: r.officerIndex,
          positionId: r.positionId,
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
  await requireAuth()
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
