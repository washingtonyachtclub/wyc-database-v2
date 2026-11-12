import db from '@/db'
import { WORK_PARTY_TYPE_ID } from '@/db/constants'
import { lessons, lessonSessions } from '@/db/schema'
import { eq, gte } from 'drizzle-orm'
import { upsertSessionEvent } from '@/lib/gcal'
import { baseLessonQuery, fetchLessonSessions } from './queries'
import { toRichLesson, type RichLesson } from './schema'
import { CALENDAR_SYNC_START_DATE } from './visibility'

export async function calendarLessonIds(): Promise<number[]> {
  const rows = await db
    .selectDistinct({ id: lessonSessions.lessonId })
    .from(lessonSessions)
    .where(gte(lessonSessions.startsAt, `${CALENDAR_SYNC_START_DATE} 00:00:00`))
    .orderBy(lessonSessions.lessonId)
  return rows.map((row) => row.id)
}

export function calendarLesson(lesson: RichLesson) {
  return {
    title: lesson.subtype || lesson.type || 'WYC Lesson',
    location: lesson.location,
    description: lesson.description,
    requirements: lesson.requirements,
    instructors: [lesson.instructor1Name, lesson.instructor2Name].filter(
      (name) => name !== '' && name !== '<Unknown>',
    ),
    colorId: lesson.classTypeId === WORK_PARTY_TYPE_ID ? '4' : undefined,
  }
}

export async function lessonCalendarEntries(lessonId: number) {
  const [row] = await baseLessonQuery().where(eq(lessons.index, lessonId))
  if (!row) return []
  const lesson = toRichLesson(row, await fetchLessonSessions(lessonId))
  const details = calendarLesson(lesson)
  return lesson.sessions
    .filter((session) => session.startsAt.slice(0, 10) >= CALENDAR_SYNC_START_DATE)
    .map((session) => ({ lessonId, details, session }))
}

export async function syncLessonCalendar(lessonId: number) {
  for (const { details, session } of await lessonCalendarEntries(lessonId)) {
    await upsertSessionEvent(details, session)
  }
}
