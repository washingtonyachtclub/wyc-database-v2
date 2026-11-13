import { getNowPacificDateTimeString } from '@/lib/date-utils'
import type { LessonSession } from './schema'

export const CALENDAR_SYNC_START_DATE = '2026-07-21'

export function lessonSignupsOpen(
  sessions: LessonSession[],
  now = getNowPacificDateTimeString(),
): boolean {
  return (
    sessions.length > 0 &&
    sessions.every((session) => {
      const start = session.allDay ? `${session.startsAt.slice(0, 10)} 00:00:00` : session.startsAt
      return start > now
    })
  )
}
