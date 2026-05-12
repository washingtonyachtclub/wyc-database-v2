import { z } from 'zod'
import type { ExaminerQueryRow } from './queries'
import { num, fullName } from '@/db/mapper-utils'

// --- Zod schemas ---

export const examinerInsertSchema = z.object({
  member: z.number({ error: 'Member is required' }).min(1, 'Member is required'),
})

export type ExaminerInsertData = z.infer<typeof examinerInsertSchema>

// --- Display types ---

export type ExaminerTableRow = {
  officerIndex: number
  wycNumber: number
  memberName: string
  active: boolean
  skipperRatings: string
}

// --- Mappers ---

export function toExaminerRow(row: ExaminerQueryRow): Omit<ExaminerTableRow, 'skipperRatings'> {
  return {
    officerIndex: row.officerIndex,
    wycNumber: num(row.wycNumber),
    memberName: fullName(row.memberFirst, row.memberLast),
    active: row.active === 1,
  }
}
