import { eq } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import db from 'src/db'
import { baseHonoraryQuery, type HonoraryFilters, withHonoraryFilters } from 'src/db/honorary-queries'
import { toHonoraryRow } from 'src/db/honorary-schema'
import { officers } from 'src/db/schema'
import { requirePrivilege } from '../lib/auth-middleware'

export const getHonoraryTable = createServerFn({ method: 'GET' })
  .inputValidator(
    (input: { filters?: HonoraryFilters }) => ({
      filters: input.filters,
    }),
  )
  .handler(async ({ data }) => {
    await requirePrivilege('db')
    try {
      const { filters } = data
      const query = baseHonoraryQuery().$dynamic()
      withHonoraryFilters(query, filters)
      const rawRows = await query
      return rawRows.map(toHonoraryRow).sort((a, b) => b.expireQtrIndex - a.expireQtrIndex)
    } catch (error) {
      console.error('Failed to fetch honorary members:', error)
      throw new Error('Failed to fetch honorary members')
    }
  })

export const deleteHonorary = createServerFn({ method: 'POST' })
  .inputValidator((input: { officerIndex: number }) => input)
  .handler(async ({ data: { officerIndex } }) => {
    await requirePrivilege('db')
    try {
      await db.delete(officers).where(eq(officers.index, officerIndex))
      return { success: true }
    } catch (error) {
      console.error('Failed to delete honorary member:', error)
      throw new Error('Failed to delete honorary member')
    }
  })
