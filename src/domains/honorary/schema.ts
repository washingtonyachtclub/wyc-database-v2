import { z } from 'zod'
import type { HonoraryQueryRow } from './queries'
import { num, str, fullName } from '@/db/mapper-utils'

// --- Zod schemas ---

export const honoraryInsertSchema = z.object({
  member: z.number({ error: 'Member is required' }).min(1, 'Member is required'),
})

export type HonoraryInsertData = z.infer<typeof honoraryInsertSchema>

// --- Display types ---

export type HonoraryTableRow = {
  wycNumber: number
  memberName: string
  officerIndex: number
  expireQtr: string
  expireQtrIndex: number
}

// --- Mappers ---

export function toHonoraryRow(row: HonoraryQueryRow) {
  return {
    officerIndex: row.officerIndex,
    wycNumber: num(row.wycNumber),
    memberName: fullName(row.memberFirst, row.memberLast),
    expireQtr: str(row.expireQtrSchoolText),
    expireQtrIndex: num(row.expireQtrIndex),
  }
}
