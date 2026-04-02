import { z } from 'zod'
import type { PrivilegeQueryRow } from './privilege-queries'
import { num, str, fullName } from './mapper-utils'

// --- Zod schemas ---

export const privilegeInsertSchema = z.object({
  member: z.number({ error: 'Member is required' }).min(1, 'Member is required'),
  position: z.number({ error: 'Position is required' }).min(1, 'Position is required'),
})

export type PrivilegeInsertData = z.infer<typeof privilegeInsertSchema>

// --- Display types ---

export type PrivilegeRole = {
  officerIndex: number
  name: string
}

export type PrivilegeTableRow = {
  wycNumber: number
  memberName: string
  outToSea: boolean
  roles: PrivilegeRole[]
}

// --- Mappers ---

export function toPrivilegeRow(row: PrivilegeQueryRow) {
  return {
    officerIndex: row.index,
    wycNumber: num(row.wycNumber),
    memberName: fullName(row.memberFirst, row.memberLast),
    positionId: num(row.positionId),
    positionName: str(row.positionName),
    outToSea: (row.outToSea ?? 0) !== 0,
  }
}
