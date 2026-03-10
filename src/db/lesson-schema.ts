import { z } from 'zod'

export const lessonInsertSchema = z.object({
  classTypeId: z.number({ error: 'Type is required' }).nullable(),
  subtype: z.string().min(1, 'Title is required'),
  day: z.string().min(1, 'Day of week is required'),
  time: z.string().min(1, 'Time is required'),
  dates: z.string().min(1, 'Dates are required'),
  calendarDate: z.string().min(1, 'Calendar date is required'),
  instructor1: z.number(),
  instructor2: z.number().nullable(),
  description: z.string(),
  size: z.number({ error: 'Size is required' }).int(),
  expire: z.number({ error: 'Expire quarter is required' }),
  display: z.boolean(),
})
