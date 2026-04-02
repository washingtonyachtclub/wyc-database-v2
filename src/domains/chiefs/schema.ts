import { z } from 'zod'
import type { ChiefQueryRow } from './queries'
import { num, str, fullName } from '@/db/mapper-utils'

// --- Zod schemas ---

export const chiefInsertSchema = z.object({
  member: z.number({ error: 'Member is required' }).min(1, 'Member is required'),
  position: z.number({ error: 'Position is required' }).min(1, 'Position is required'),
})

export type ChiefInsertData = z.infer<typeof chiefInsertSchema>

// --- Core & display types ---

export type ChiefRole = {
  officerIndex: number
  name: string
}

export type ChiefTableRow = {
  wycNumber: number
  memberName: string
  chiefRoles: ChiefRole[]
}

// --- Mappers ---

export function toChiefRow(row: ChiefQueryRow) {
  return {
    officerIndex: row.index,
    wycNumber: num(row.wycNumber),
    memberName: fullName(row.memberFirst, row.memberLast),
    positionId: num(row.positionId),
    positionName: str(row.positionName),
  }
}
