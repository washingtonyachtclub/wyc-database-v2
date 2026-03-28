import { z } from 'zod'

export const honoraryInsertSchema = z.object({
  member: z.number({ error: 'Member is required' }).min(1, 'Member is required'),
})

export type HonoraryInsertData = z.infer<typeof honoraryInsertSchema>

export type HonoraryTableRow = {
  wycNumber: number
  memberName: string
  officerIndex: number
  expireQtr: string
  expireQtrIndex: number
}
