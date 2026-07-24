import { createServerFn } from '@tanstack/react-start'
import { asc, count, eq } from 'drizzle-orm'
import type { LessonTypeInsertData } from '@/domains/lesson-types/schema'
import { toLessonType } from '@/domains/lesson-types/schema'
import { classType, lessons } from '@/db/schema'
import db from '@/db/index'
import { requireAuth, requirePrivilege } from '@/lib/auth/auth-middleware'

export const getAllLessonTypes = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAuth()
  const rows = await db.select().from(classType).orderBy(asc(classType.text))
  const usage = await db
    .select({ type: lessons.type, n: count() })
    .from(lessons)
    .groupBy(lessons.type)
  const counts = new Map(usage.map((u) => [u.type, u.n]))
  return rows.map((r) => toLessonType(r, counts.get(r.index) ?? 0))
})

export const createLessonType = createServerFn({ method: 'POST' })
  .inputValidator((input: LessonTypeInsertData) => input)
  .handler(async ({ data }) => {
    await requirePrivilege('db')
    try {
      await db.insert(classType).values({ text: data.text })
      return { success: true }
    } catch (error) {
      console.error('Failed to create lesson type:', error)
      throw new Error('Failed to create lesson type')
    }
  })

export const deleteLessonType = createServerFn({ method: 'POST' })
  .inputValidator((input: { index: number }) => input)
  .handler(async ({ data: { index } }) => {
    await requirePrivilege('db')
    const [{ n }] = await db.select({ n: count() }).from(lessons).where(eq(lessons.type, index))
    if (n > 0) throw new Error(`Cannot delete: ${n} lesson(s) still use this type.`)
    try {
      await db.delete(classType).where(eq(classType.index, index))
      return { success: true }
    } catch (error) {
      console.error('Failed to delete lesson type:', error)
      throw new Error('Failed to delete lesson type')
    }
  })
