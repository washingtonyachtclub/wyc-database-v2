import { createServerFn } from '@tanstack/react-start'
import { asc, eq } from 'drizzle-orm'
import type { ClassTypeInsertData } from '@/domains/class-types/schema'
import { toClassType } from '@/domains/class-types/schema'
import { classType } from 'src/db/schema'
import db from '@/db/index'
import { requireAuth, requirePrivilege } from '@/lib/auth/auth-middleware'

export const getAllClassTypes = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAuth()
  const rows = await db.select().from(classType).orderBy(asc(classType.text))
  return rows.map(toClassType)
})

export const createClassType = createServerFn({ method: 'POST' })
  .inputValidator((input: ClassTypeInsertData) => input)
  .handler(async ({ data }) => {
    await requirePrivilege('db')
    try {
      await db.insert(classType).values({ text: data.text })
      return { success: true }
    } catch (error) {
      console.error('Failed to create class type:', error)
      throw new Error('Failed to create lesson type')
    }
  })

export const deleteClassType = createServerFn({ method: 'POST' })
  .inputValidator((input: { index: number }) => input)
  .handler(async ({ data: { index } }) => {
    await requirePrivilege('db')
    try {
      await db.delete(classType).where(eq(classType.index, index))
      return { success: true }
    } catch (error) {
      console.error('Failed to delete class type:', error)
      throw new Error('Failed to delete lesson type')
    }
  })
