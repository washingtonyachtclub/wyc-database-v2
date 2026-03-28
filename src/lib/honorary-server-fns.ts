import { eq } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import db from 'src/db'
import { baseHonoraryQuery } from 'src/db/honorary-queries'
import { toHonoraryRow } from 'src/db/mappers'
import { officers } from 'src/db/schema'
import { requirePrivilege } from '../lib/auth-middleware'

export const getHonoraryTable = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePrivilege('db')
  try {
    const rawRows = await baseHonoraryQuery()
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
