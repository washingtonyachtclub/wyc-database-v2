import { createServerFn } from '@tanstack/react-start'
import { desc, eq } from 'drizzle-orm'
import type { QuarterInsertData } from '@/domains/quarters/schema'
import { toQuarter } from '@/domains/quarters/schema'
import { quarters } from 'src/db/schema'
import db from '@/db/index'
import { requireAuth, requirePrivilege } from '@/lib/auth/auth-middleware'

export const getAllQuarters = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAuth()
  const rows = await db.select().from(quarters).orderBy(desc(quarters.index))
  return rows.map(toQuarter)
})

export const createQuarter = createServerFn({ method: 'POST' })
  .inputValidator((input: QuarterInsertData) => input)
  .handler(async ({ data }) => {
    await requirePrivilege('db')
    try {
      await db.insert(quarters).values({
        text: data.text,
        school: data.school,
        endDate: data.endDate,
      })
      return { success: true }
    } catch (error) {
      console.error('Failed to create quarter:', error)
      throw new Error('Failed to create quarter')
    }
  })

export const deleteQuarter = createServerFn({ method: 'POST' })
  .inputValidator((input: { index: number }) => input)
  .handler(async ({ data: { index } }) => {
    await requirePrivilege('db')
    try {
      await db.delete(quarters).where(eq(quarters.index, index))
      return { success: true }
    } catch (error) {
      console.error('Failed to delete quarter:', error)
      throw new Error('Failed to delete quarter')
    }
  })
