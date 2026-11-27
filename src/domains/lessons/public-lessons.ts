import db from '@/db'
import { lessons, signups } from '@/db/schema'
import { asc, count, inArray } from 'drizzle-orm'
import { baseLessonQuery, fetchSessionsByLesson, lessonIdsEndingOnOrAfter } from './queries'
import { byDateThenStart, toRichLesson } from './schema'

export async function listPublicLessons(today: string) {
  // No auth required — this is the public lesson list for the WordPress iframe
  const raw = await baseLessonQuery()
    .where(inArray(lessons.index, lessonIdsEndingOnOrAfter(today)))
    .orderBy(asc(lessons.calendarDate))

  const lessonIds = raw.map((r) => r.index)

  // Batch enrollment counts
  let enrollmentCounts = new Map<number, number>()
  if (lessonIds.length > 0) {
    const counts = await db
      .select({ class: signups.class, count: count() })
      .from(signups)
      .where(inArray(signups.class, lessonIds))
      .groupBy(signups.class)
    enrollmentCounts = new Map(counts.map((c) => [c.class, c.count]))
  }

  const sessionsByLesson = await fetchSessionsByLesson(lessonIds)

  return raw
    .map((row) => ({
      lesson: toRichLesson(row, sessionsByLesson.get(row.index) ?? []),
      enrolledCount: enrollmentCounts.get(row.index) ?? 0,
    }))
    .sort((a, b) => byDateThenStart(a.lesson, b.lesson))
}
