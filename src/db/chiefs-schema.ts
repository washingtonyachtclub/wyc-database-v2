import { z } from 'zod'

export const chiefInsertSchema = z.object({
  member: z.number({ error: 'Member is required' }).min(1, 'Member is required'),
  position: z.number({ error: 'Position is required' }).min(1, 'Position is required'),
})

export type ChiefInsertData = z.infer<typeof chiefInsertSchema>
