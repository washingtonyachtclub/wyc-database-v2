import { z } from 'zod'
import type { OfficerQueryRow } from './officer-queries'
import { num, str, fullName } from './mapper-utils'

// --- Zod schemas ---

export const officerInsertSchema = z.object({
  member: z.number({ error: 'Member is required' }).min(1, 'Member is required'),
  position: z.number({ error: 'Position is required' }).min(1, 'Position is required'),
})

export type OfficerInsert = z.infer<typeof officerInsertSchema>

// --- Core types ---

export type Officer = {
  index: number
  wycNumber: number
  memberName: string
  positionId: number
  positionName: string
  positionType: string
  isDuesExempt: boolean
  active: boolean
}

// --- Mappers ---

export function toOfficer(row: OfficerQueryRow): Officer {
  return {
    index: row.index,
    wycNumber: num(row.wycNumber),
    memberName: fullName(row.memberFirst, row.memberLast),
    positionId: num(row.positionId),
    positionName: str(row.positionName),
    positionType: row.positionType ?? '<Unknown>',
    isDuesExempt: (row.isDuesExempt ?? 0) !== 0,
    active: row.active !== 0,
  }
}
