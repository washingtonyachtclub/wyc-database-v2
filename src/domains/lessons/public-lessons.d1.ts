import { env } from 'cloudflare:workers'
import type { LessonQueryRow } from './queries'
import { byDateThenStart, toLessonSession, toRichLesson, type LessonSessionRow } from './schema'

type PublicLessonRow = LessonQueryRow &
  Omit<LessonSessionRow, 'index' | 'lessonId'> & {
    sessionId: number
    enrolledCount: number
  }

export async function listPublicLessons(today: string) {
  const { results } = await env.DB.prepare(
    `SELECT l._index AS "index", l.type AS typeId, t.text AS type, l.subtype,
            l.CalendarDate AS calendarDate, l.instructor1, l.instructor2,
            i1.First AS instructor1First, i1.Last AS instructor1Last,
            i2.First AS instructor2First, i2.Last AS instructor2Last,
            l.Description AS description, l.requirements, l.size, l.expire,
            (SELECT COUNT(*) FROM signups WHERE class = l._index) AS enrolledCount,
            s._index AS sessionId, s.starts_at AS startsAt, s.ends_at AS endsAt,
            s.all_day AS allDay, s.location, s.location_url AS locationUrl
       FROM lessons l
       JOIN lesson_sessions s ON s.lesson_id = l._index
       LEFT JOIN class_type t ON t._index = l.type
       LEFT JOIN WYCDatabase i1 ON i1.WYCNumber = l.instructor1
       LEFT JOIN WYCDatabase i2 ON i2.WYCNumber = l.instructor2
      WHERE l._index IN (SELECT lesson_id FROM lesson_sessions WHERE ends_at >= ?)
      ORDER BY l.CalendarDate, l._index, s.starts_at, s._index`,
  )
    .bind(`${today} 00:00:00`)
    .all<PublicLessonRow>()

  const lessons = new Map<
    number,
    { lesson: ReturnType<typeof toRichLesson>; enrolledCount: number }
  >()
  for (const row of results) {
    let entry = lessons.get(row.index)
    if (!entry) {
      entry = { lesson: toRichLesson(row, []), enrolledCount: row.enrolledCount }
      lessons.set(row.index, entry)
    }
    entry.lesson.sessions.push(
      toLessonSession({ ...row, index: row.sessionId, lessonId: row.index }),
    )
  }
  return [...lessons.values()].sort((a, b) => byDateThenStart(a.lesson, b.lesson))
}
