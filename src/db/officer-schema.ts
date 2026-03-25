import { z } from 'zod'

export const officerInsertSchema = z.object({
  member: z.number({ error: 'Member is required' }).min(1, 'Member is required'),
  position: z.number({ error: 'Position is required' }).min(1, 'Position is required'),
})

export type OfficerInsert = z.infer<typeof officerInsertSchema>
