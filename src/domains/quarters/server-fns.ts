import { createServerFn } from '@tanstack/react-start'
import { and, count, desc, eq, gte, lt, sql } from 'drizzle-orm'
import type { QuarterInsertData } from '@/domains/quarters/schema'
import { toQuarter } from '@/domains/quarters/schema'
import { lessonQuarter, lessons, quarters, wycDatabase } from '@/db/schema'
import db from '@/db/index'
import { requireAuth, requirePrivilege } from '@/lib/auth/auth-middleware'
import { readQuarterConfig } from './config'
import { z } from 'zod'
import { daysUntil } from '@/lib/date-utils'

export const QUARTERS_AHEAD_TARGET = 8
export const QUARTERS_AHEAD_MIN = 6

export type RenewalReminder =
  | { state: 'stale' }
  | { state: 'dueSoon'; quarterName: string; days: number }
  | null

async function getQuarterUsageCounts() {
  const memberUsage = await db
    .select({ q: wycDatabase.expireQtrIndex, n: count() })
    .from(wycDatabase)
    .groupBy(wycDatabase.expireQtrIndex)
  const lessonUsage = await db
    .select({ q: lessons.expire, n: count() })
    .from(lessons)
    .groupBy(lessons.expire)
  const counts = new Map<number, number>()
  for (const u of [...memberUsage, ...lessonUsage]) {
    if (u.q != null) counts.set(u.q, (counts.get(u.q) ?? 0) + u.n)
  }
  return counts
}

export const getAllQuarters = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAuth()
  const rows = await db.select().from(quarters).orderBy(desc(quarters.index))
  const counts = await getQuarterUsageCounts()
  return rows.map((r) => toQuarter(r, counts.get(r.index) ?? 0))
})

export const createQuarter = createServerFn({ method: 'POST' })
  .validator((input: QuarterInsertData) => input)
  .handler(async ({ data }) => {
    await requirePrivilege('db')
    try {
      await db.insert(quarters).values({
        text: data.text,
        school: data.school,
        endDate: data.endDate || null,
      })
      return { success: true }
    } catch (error) {
      console.error('Failed to create quarter:', error)
      throw new Error('Failed to create quarter')
    }
  })

export const getQuarterHealth = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePrivilege('db')

  const { currentQuarter, renewalQuarter } = await readQuarterConfig()

  const rows = await db
    .select({ index: quarters.index, school: quarters.school, endDate: quarters.endDate })
    .from(quarters)
  const maxIndex = rows.reduce((max, r) => Math.max(max, r.index), 0)

  // Only the quarter you're in and the one you're about to enter are actionable; later
  // quarters' end dates aren't published yet, so don't nag about them.
  const missingEndDates = [currentQuarter, currentQuarter + 1]
    .map((idx) => rows.find((r) => r.index === idx))
    .filter((r): r is (typeof rows)[number] => Boolean(r) && !r!.endDate)
    .map((r) => r.school ?? `quarter ${r.index}`)

  const quartersAhead = maxIndex - currentQuarter

  const current = rows.find((r) => r.index === currentQuarter)
  const daysToEnd = current?.endDate != null ? daysUntil(current.endDate) : null
  const currentQuarterOverdue =
    current?.endDate != null && daysToEnd != null && daysToEnd < 0
      ? {
          quarterName: current.school ?? `quarter ${currentQuarter}`,
          endDate: current.endDate,
        }
      : null

  const renewalReminder: RenewalReminder =
    renewalQuarter < currentQuarter
      ? { state: 'stale' }
      : renewalQuarter === currentQuarter && daysToEnd != null && daysToEnd <= 14
        ? {
            state: 'dueSoon',
            quarterName: current?.school ?? `quarter ${currentQuarter}`,
            days: daysToEnd,
          }
        : null

  return {
    currentQuarter,
    renewalQuarter,
    quartersAhead,
    target: QUARTERS_AHEAD_TARGET,
    isLow: quartersAhead < QUARTERS_AHEAD_MIN,
    missingEndDates,
    currentQuarterOverdue,
    renewalReminder,
  }
})

export const updateQuarter = createServerFn({ method: 'POST' })
  .validator((input: { index: number } & QuarterInsertData) => input)
  .handler(async ({ data }) => {
    await requirePrivilege('db')
    try {
      await db
        .update(quarters)
        .set({ text: data.text, school: data.school, endDate: data.endDate || null })
        .where(eq(quarters.index, data.index))
      return { success: true }
    } catch (error) {
      console.error('Failed to update quarter:', error)
      throw new Error('Failed to update quarter')
    }
  })

export const getQuarterChangeImpact = createServerFn({ method: 'GET' })
  .validator((input: { newQuarter: number }) => input)
  .handler(async ({ data: { newQuarter } }) => {
    await requirePrivilege('db')

    const quarterRow = await db
      .select({ quarter: lessonQuarter.quarter })
      .from(lessonQuarter)
      .where(eq(lessonQuarter.index, 1))
      .limit(1)
    const currentQuarter = quarterRow[0].quarter

    if (newQuarter === currentQuarter) {
      return { currentQuarter, membersAffected: 0, direction: 'same' as const }
    }

    const forward = newQuarter > currentQuarter
    const [low, high] = forward ? [currentQuarter, newQuarter] : [newQuarter, currentQuarter]

    const [memberResult] = await db
      .select({ count: count() })
      .from(wycDatabase)
      .where(and(gte(wycDatabase.expireQtrIndex, low), lt(wycDatabase.expireQtrIndex, high)))

    return {
      currentQuarter,
      membersAffected: memberResult.count,
      direction: forward ? ('forward' as const) : ('backward' as const),
    }
  })

export const updateCurrentQuarter = createServerFn({ method: 'POST' })
  .validator((input: { newQuarter: number }) => input)
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
  .validator((input: { index: number }) => input)
  .handler(async ({ data: { index } }) => {
    await requirePrivilege('db')
    const [{ n: memberN }] = await db
      .select({ n: count() })
      .from(wycDatabase)
      .where(eq(wycDatabase.expireQtrIndex, index))
    const [{ n: lessonN }] = await db
      .select({ n: count() })
      .from(lessons)
      .where(eq(lessons.expire, index))
    const total = memberN + lessonN
    if (total > 0) {
      throw new Error(
        `Cannot delete: ${total} member/lesson record(s) still reference this quarter.`,
      )
    }
    try {
      await db.delete(quarters).where(eq(quarters.index, index))
      return { success: true }
    } catch (error) {
      console.error('Failed to delete quarter:', error)
      throw new Error('Failed to delete quarter')
    }
  })

export const updateRenewalQuarter = createServerFn({ method: 'POST' })
  .validator(
    z.object({ newQuarter: z.number().int().positive(), previousQuarter: z.number().int() }),
  )
  .handler(async ({ data }) => {
    await requirePrivilege('db')
    try {
      const changed = await db
        .update(lessonQuarter)
        .set({ renewalQuarter: data.newQuarter })
        .where(
          and(
            eq(lessonQuarter.index, 1),
            eq(lessonQuarter.renewalQuarter, data.previousQuarter),
            sql`${data.newQuarter}::integer IN (${lessonQuarter.quarter}, ${lessonQuarter.quarter} + 1)`,
          ),
        )
        .returning({ quarter: lessonQuarter.renewalQuarter })
      return { updated: changed.length > 0 }
    } catch (error) {
      console.error('Failed to update renewal quarter:', error)
      throw new Error('Failed to update renewal quarter')
    }
  })
