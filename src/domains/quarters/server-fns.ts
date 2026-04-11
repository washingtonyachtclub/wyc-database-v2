import { createServerFn } from '@tanstack/react-start'
import { and, count, desc, eq, gte, lt } from 'drizzle-orm'
import type { QuarterInsertData } from '@/domains/quarters/schema'
import { toQuarter } from '@/domains/quarters/schema'
import { lessonQuarter, lessons, quarters, wycDatabase } from 'src/db/schema'
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

export const getQuarterChangeImpact = createServerFn({ method: 'GET' })
  .inputValidator((input: { newQuarter: number }) => input)
  .handler(async ({ data: { newQuarter } }) => {
    await requirePrivilege('db')

    const quarterRow = await db
      .select({ quarter: lessonQuarter.quarter })
      .from(lessonQuarter)
      .where(eq(lessonQuarter.index, 1))
      .limit(1)
    const currentQuarter = quarterRow[0].quarter

    if (newQuarter === currentQuarter) {
      return { currentQuarter, membersAffected: 0, lessonsAffected: 0, direction: 'same' as const }
    }

    const forward = newQuarter > currentQuarter
    const [low, high] = forward ? [currentQuarter, newQuarter] : [newQuarter, currentQuarter]

    const [memberResult] = await db
      .select({ count: count() })
      .from(wycDatabase)
      .where(and(gte(wycDatabase.expireQtrIndex, low), lt(wycDatabase.expireQtrIndex, high)))

    const [lessonResult] = await db
      .select({ count: count() })
      .from(lessons)
      .where(and(gte(lessons.expire, low), lt(lessons.expire, high), eq(lessons.display, 1)))

    return {
      currentQuarter,
      membersAffected: memberResult.count,
      lessonsAffected: lessonResult.count,
      direction: forward ? ('forward' as const) : ('backward' as const),
    }
  })

export const updateCurrentQuarter = createServerFn({ method: 'POST' })
  .inputValidator((input: { newQuarter: number }) => input)
  .handler(async ({ data: { newQuarter } }) => {
    await requirePrivilege('db')

    const quarterRow = await db
      .select({ quarter: lessonQuarter.quarter })
      .from(lessonQuarter)
      .where(eq(lessonQuarter.index, 1))
      .limit(1)
    const previousQuarter = quarterRow[0].quarter

    try {
      await db.update(lessonQuarter).set({ quarter: newQuarter }).where(eq(lessonQuarter.index, 1))
      return { previousQuarter, newQuarter }
    } catch (error) {
      console.error('Failed to update current quarter:', error)
      throw new Error('Failed to update current quarter')
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
