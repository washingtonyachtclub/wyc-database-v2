import { createServerFn } from '@tanstack/react-start'
import { desc, eq, gte } from 'drizzle-orm'
import db from '@/db'
import { lessonQuarter, membershipPayments, quarters, wycDatabase } from '@/db/schema'
import { requirePrivilege } from '@/lib/auth/auth-middleware'
import { computeMembershipStats } from './schema'

export const getMembershipStats = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePrivilege('db')
  try {
    const [currentQuarter] = await db
      .select({ index: lessonQuarter.quarter, school: quarters.school })
      .from(lessonQuarter)
      .innerJoin(quarters, eq(quarters.index, lessonQuarter.quarter))
      .where(eq(lessonQuarter.index, 1))
      .limit(1)

    const currentQuarterIndex = currentQuarter.index

    const members = await db
      .select({ wycNumber: wycDatabase.wycNumber, categoryId: wycDatabase.categoryId })
      .from(wycDatabase)
      .where(gte(wycDatabase.expireQtrIndex, currentQuarterIndex))

    // A member's most recent payment row decides paid vs exempt: EXEMPT is the only
    // non-dues-paying signal (honoraries and instructors are granted exemptions through
    // the renewal flow, so they land here too). Rows are append-only, so higher _index is newer.
    const payments = await db
      .select({ wycNumber: membershipPayments.wycNumber, status: membershipPayments.status })
      .from(membershipPayments)
      .orderBy(desc(membershipPayments.index))

    const latestStatus = new Map<number, string>()
    for (const payment of payments) {
      if (!latestStatus.has(payment.wycNumber)) latestStatus.set(payment.wycNumber, payment.status)
    }

    const exemptWycNumbers = new Set(
      members.map((m) => m.wycNumber).filter((n) => latestStatus.get(n) === 'EXEMPT'),
    )

    return computeMembershipStats({
      currentQuarterIndex,
      currentQuarterText: currentQuarter.school ?? `Quarter ${currentQuarterIndex}`,
      members,
      exemptWycNumbers,
    })
  } catch (error) {
    console.error('Failed to compute membership stats:', error)
    throw new Error('Failed to compute membership stats')
  }
})
