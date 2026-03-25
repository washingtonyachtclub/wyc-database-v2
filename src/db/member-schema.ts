import { z } from 'zod'

export const AddMemberFormSchema = z.object({
  last: z.string().min(1, 'Last name is required'),
  first: z.string().min(1, 'First name is required'),
  streetAddress: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  phone1: z.string(),
  phone2: z.string(),
  email: z.email('Invalid email address'),
  categoryId: z.number().nullable(),
  expireQtrIndex: z.number(),
  studentId: z.number().nullable(),
  outToSea: z.boolean(),
})

export const MemberProfileUpdateSchema = AddMemberFormSchema.omit({
  expireQtrIndex: true,
  categoryId: true,
})
