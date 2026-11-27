import { lessonQuarterIndex } from './quarter-query'
import { asc, eq, getTableColumns, gte, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { db } from '@/db'
import { lessons, lessonSessions, signups, classType, wycDatabase } from '@/db/schema'
import { byDateThenStart, toLessonSession, toRichLesson, type RichLesson } from './schema'

const firstInstructor = alias(wycDatabase, 'i1')
const secondInstructor = alias(wycDatabase, 'i2')

export async function listPublicLessons(today: string) {
  const upcoming = db
    .select({ id: lessonSessions.lessonId })
    .from(lessonSessions)
    .where(gte(lessonSessions.endsAt, `${today} 00:00:00`))
  const rows = await db
    .select({
      lesson: {
        index: lessons.index,
        typeId: lessons.type,
        type: classType.text,
        subtype: lessons.subtype,
        calendarDate: lessons.calendarDate,
        instructor1: lessons.instructor1,
        instructor2: lessons.instructor2,
        instructor1First: firstInstructor.first,
        instructor1Last: firstInstructor.last,
        instructor2First: secondInstructor.first,
        instructor2Last: secondInstructor.last,
        description: lessons.description,
        requirements: lessons.requirements,
        size: lessons.size,
        expire: lessonQuarterIndex,
      },
      session: getTableColumns(lessonSessions),
      enrolledCount: db.$count(signups, eq(signups.class, lessons.index)),
    })
    .from(lessons)
    .innerJoin(lessonSessions, eq(lessonSessions.lessonId, lessons.index))
    .leftJoin(classType, eq(classType.index, lessons.type))
    .leftJoin(firstInstructor, eq(firstInstructor.wycNumber, lessons.instructor1))
    .leftJoin(secondInstructor, eq(secondInstructor.wycNumber, lessons.instructor2))
    .where(inArray(lessons.index, upcoming))
    .orderBy(
      asc(lessons.calendarDate),
      asc(lessons.index),
      asc(lessonSessions.startsAt),
      asc(lessonSessions.index),
    )

  const byLesson = new Map<number, { lesson: RichLesson; enrolledCount: number }>()
  for (const row of rows) {
    let entry = byLesson.get(row.lesson.index)
    if (!entry) {
      entry = { lesson: toRichLesson(row.lesson, []), enrolledCount: row.enrolledCount }
      byLesson.set(row.lesson.index, entry)
    }
    entry.lesson.sessions.push(toLessonSession(row.session))
  }
  return [...byLesson.values()].sort((a, b) => byDateThenStart(a.lesson, b.lesson))
}
