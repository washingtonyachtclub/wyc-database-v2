import { z } from 'zod'

export const boatTypeInsertSchema = z.object({
  type: z.string().min(1, 'Type name is required'),
  description: z.string(),
  fleet: z.string().min(1, 'Fleet is required'),
})

export type BoatTypeInsertData = z.infer<typeof boatTypeInsertSchema>
