import { createServerFn } from '@tanstack/react-start'
import { and, count, desc, eq, gte, lt } from 'drizzle-orm'
import type { QuarterInsertData } from '@/domains/quarters/schema'
import { toQuarter } from '@/domains/quarters/schema'
import { lessonQuarter, lessons, quarters, wycDatabase } from '@/db/schema'
import db from '@/db/index'
import { requireAuth, requirePrivilege } from '@/lib/auth/auth-middleware'
import { RENEWAL_QUARTER } from '@/domains/renewals/compute-renewal'
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
  .inputValidator((input: QuarterInsertData) => input)
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

  const [cq] = await db
    .select({ quarter: lessonQuarter.quarter })
    .from(lessonQuarter)
    .where(eq(lessonQuarter.index, 1))
    .limit(1)
  const currentQuarter = cq.quarter

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

  // RENEWAL_QUARTER is hand-maintained and normally equals the current quarter. It gets bumped to
  // the next quarter a couple weeks early so members can renew ahead of the rollover. Nag once we're
  // inside that window and it hasn't been bumped yet ('dueSoon'), or if the quarter already rolled
  // past it ('stale'/overdue). A missing end date is nagged separately.
  const renewalReminder: RenewalReminder =
    RENEWAL_QUARTER < currentQuarter
      ? { state: 'stale' }
      : RENEWAL_QUARTER === currentQuarter && daysToEnd != null && daysToEnd <= 14
        ? {
            state: 'dueSoon',
            quarterName: current?.school ?? `quarter ${currentQuarter}`,
            days: daysToEnd,
          }
        : null

  return {
    currentQuarter,
    quartersAhead,
    target: QUARTERS_AHEAD_TARGET,
    isLow: quartersAhead < QUARTERS_AHEAD_MIN,
    missingEndDates,
    currentQuarterOverdue,
    renewalReminder,
  }
})

export const updateQuarter = createServerFn({ method: 'POST' })
  .inputValidator((input: { index: number } & QuarterInsertData) => input)
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
