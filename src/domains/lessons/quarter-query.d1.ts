import { and, asc, eq, gte, max, sql } from 'drizzle-orm'
import { alias, QueryBuilder } from 'drizzle-orm/sqlite-core'
import { lessonSessions, lessons, quarters } from '@/db/schema.d1'
import { FIRST_LESSON_QUARTER } from './quarter-rules'

const qb = new QueryBuilder()
const lastSession = qb
  .select({ end: max(lessonSessions.endsAt) })
  .from(lessonSessions)
  .where(eq(lessonSessions.lessonId, lessons.index))

// Sessionless historical lessons have only CalendarDate.
const finalDay = sql<string>`coalesce(date(${lastSession}), ${lessons.calendarDate})`

const previous = alias(quarters, 'previous_quarter')
const quarter = qb
  .select({
    index: sql<
      number | null
    >`case when ${quarters.endDate} = ${finalDay} or ${previous.endDate} < ${finalDay} then ${quarters.index} end`,
  })
  .from(quarters)
  .leftJoin(previous, eq(previous.index, sql`${quarters.index} - 1`))
  .where(and(gte(quarters.index, FIRST_LESSON_QUARTER), gte(quarters.endDate, finalDay)))
  .orderBy(asc(quarters.index))
  .limit(1)

export const lessonQuarterIndex = sql<number | null>`${quarter}`
