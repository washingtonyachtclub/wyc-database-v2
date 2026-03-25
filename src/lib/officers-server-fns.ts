import { createServerFn } from '@tanstack/react-start'
import { toOfficer } from 'src/db/mappers'
import { baseMemberPositionsQuery, baseOfficersQuery } from 'src/db/officer-queries'
import { requireAuth } from '../lib/auth-middleware'

export const getAllOfficers = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAuth()
  const raw = await baseOfficersQuery()
  return raw.map(toOfficer)
})

export const getMemberPositions = createServerFn({ method: 'GET' })
  .inputValidator((input: { wycNumber: number }) => ({ wycNumber: Number(input.wycNumber) }))
  .handler(async ({ data: { wycNumber } }) => {
    await requireAuth()
    const raw = await baseMemberPositionsQuery(wycNumber)
    return raw.map(toOfficer)
  })
