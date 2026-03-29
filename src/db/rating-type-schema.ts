import { z } from 'zod'

export const ratingTypeInsertSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  type: z.string().min(1, 'Type is required'),
  degree: z.number({ error: 'Degree is required' }).min(0, 'Degree must be 0 or greater'),
})

export type RatingTypeInsertData = z.infer<typeof ratingTypeInsertSchema>
