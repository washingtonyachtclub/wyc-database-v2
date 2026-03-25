import { z } from 'zod'

export const ratingInsertSchema = z.object({
  member: z.number({ error: 'Member is required' }).min(1, 'Member is required'),
  rating: z.number({ error: 'Rating type is required' }).min(1, 'Rating type is required'),
  date: z.string().min(1, 'Date is required'),
  examiner: z.number({ error: 'Examiner is required' }).min(1, 'Examiner is required'),
  comments: z.string(),
})

export type RatingInsertData = z.infer<typeof ratingInsertSchema>

export const ratingUpdateSchema = z.object({
  comments: z.string(),
})

export type RatingUpdate = z.infer<typeof ratingUpdateSchema>
