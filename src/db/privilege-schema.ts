import { z } from 'zod'

export const privilegeInsertSchema = z.object({
  member: z.number({ error: 'Member is required' }).min(1, 'Member is required'),
  position: z.number({ error: 'Position is required' }).min(1, 'Position is required'),
})

export type PrivilegeInsertData = z.infer<typeof privilegeInsertSchema>

export type PrivilegeRole = {
  officerIndex: number
  name: string
}

export type PrivilegeTableRow = {
  wycNumber: number
  memberName: string
  outToSea: boolean
  roles: PrivilegeRole[]
}
