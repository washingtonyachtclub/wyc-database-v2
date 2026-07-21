import { z } from 'zod'
import type { LessonQueryRow } from './queries'
import { quarterMismatchError, type QuarterDates } from './quarter-rules'
import { num, str, fullName } from '@/db/mapper-utils'
import type { classType, lessonSessions } from '@/db/schema'

// --- Zod schemas ---

export const lessonSessionInputSchema = z
  .object({
    // null for a row added in the editor.
    index: z.number().nullable(),
    date: z.string().min(1, 'Date is required'),
    endDate: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    allDay: z.boolean(),
    // Editor-only: reveals the end date input. `fromSessionInput` collapses it away.
    multiDay: z.boolean(),
  })
  .superRefine((s, ctx) => {
    if (s.multiDay) {
      if (!s.endDate) {
        ctx.addIssue({ code: 'custom', message: 'End date is required', path: ['endDate'] })
      } else if (s.endDate < s.date) {
        ctx.addIssue({ code: 'custom', message: 'End date is before the start', path: ['endDate'] })
      }
    }
    if (s.allDay) return
    if (!s.startTime) {
      ctx.addIssue({ code: 'custom', message: 'Start time is required', path: ['startTime'] })
    }
    if (!s.endTime) {
      ctx.addIssue({ code: 'custom', message: 'End time is required', path: ['endTime'] })
    }
    const end = `${effectiveEndDate(s)} ${s.endTime}`
    if (s.startTime && s.endTime && end <= `${s.date} ${s.startTime}`) {
      ctx.addIssue({ code: 'custom', message: 'End must be after the start', path: ['endTime'] })
    }
  })

/** The end date the row means; the input is only live while `multiDay` is set. */
export function effectiveEndDate(input: {
  date: string
  endDate: string
  multiDay: boolean
}): string {
  return input.multiDay && input.endDate ? input.endDate : input.date
}

export type LessonSessionInput = z.infer<typeof lessonSessionInputSchema>

export const emptySessionInput: LessonSessionInput = {
  index: null,
  date: '',
  endDate: '',
  startTime: '',
  endTime: '',
  allDay: false,
  multiDay: false,
}

export const lessonInsertSchema = z.object({
  classTypeId: z.number({ error: 'Type is required' }).min(1, 'Type is required'),
  subtype: z.string().min(1, 'Title is required'),
  sessions: z.array(lessonSessionInputSchema).min(1, 'At least one session is required'),
  instructor1: z.number(),
  instructor2: z.number().nullable(),
  comments: z.string(),
  requirements: z.string(),
  location: z.string(),
  locationUrl: z.string(),
  size: z.number({ error: 'Size is required' }).int(),
  expire: z.number({ error: 'Expire quarter is required' }),
  display: z.boolean(),
})

export type LessonInsert = z.infer<typeof lessonInsertSchema>

export function lastSessionDate(sessions: LessonSessionInput[]): string {
  return sessions.reduce((latest, s) => {
    const end = effectiveEndDate(s)
    return end > latest ? end : latest
  }, '')
}

export function lessonInsertSchemaForQuarters(quarters: QuarterDates[]) {
  return lessonInsertSchema.superRefine((data, ctx) => {
    const error = quarterMismatchError(lastSessionDate(data.sessions), data.expire, quarters)
    if (error) {
      ctx.addIssue({ code: 'custom', message: error, path: ['expire'] })
    }
  })
}

// --- Core & display types ---

export type LessonSessionRow = typeof lessonSessions.$inferSelect

/**
 * 'YYYY-MM-DD HH:MM:SS', no timezone (club local is always assumed). `endsAt` is
 * inclusive. When `allDay`, the time components are filler and mean nothing.
 */
export type LessonSession = {
  index: number
  startsAt: string
  endsAt: string
  allDay: boolean
}

export type Lesson = {
  index: number
  classTypeId: number // classType index (FK)
  subtype: string
  calendarDate: string
  instructor1: number // wycNumber (FK)
  instructor2: number | null // wycNumber (FK)
  comments: string
  requirements: string
  location: string
  locationUrl: string
  size: number
  expire: number // quarter index (FK)
  display: boolean
}
export type RichLesson = {
  index: number
  classTypeId: number // classType index
  instructor1: number
  instructor2: number | null
  expire: number // quarter index
  // resolved display fields
  type: string // classType.text
  subtype: string
  sessions: LessonSession[] // ordered by date
  calendarDate: string
  instructor1Name: string
  instructor2Name: string
  comments: string
  requirements: string
  location: string
  locationUrl: string
  size: number
  display: boolean
}
export type RichLessonWithEnrollment = RichLesson & { enrolledCount: number }

export type SignedUpLesson = RichLesson & {
  status: 'enrolled' | 'waitlisted'
  instructor1Email: string
  instructor2Email: string
}

export type LessonStudent = {
  wycNumber: number
  first: string
  last: string
  email: string
  phone1: string
}

export type ClassTypeRow = typeof classType.$inferSelect
export type ClassType = {
  index: number
  text: string
}

// --- Mappers ---

export function toLessonSession(row: LessonSessionRow): LessonSession {
  return {
    index: row.index,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    allDay: row.allDay !== 0,
  }
}

export function dateOf(dateTime: string): string {
  return dateTime.slice(0, 10)
}

export function timeOf(dateTime: string): string {
  return dateTime.slice(11, 19)
}

/** Core → the editor's decomposed shape, since date and time are separate inputs. */
export function toSessionInput(session: LessonSession): LessonSessionInput {
  return {
    index: session.index,
    date: dateOf(session.startsAt),
    endDate: dateOf(session.endsAt),
    // <input type="time"> wants 'HH:MM'.
    startTime: session.allDay ? '' : timeOf(session.startsAt).slice(0, 5),
    endTime: session.allDay ? '' : timeOf(session.endsAt).slice(0, 5),
    allDay: session.allDay,
    multiDay: dateOf(session.startsAt) !== dateOf(session.endsAt),
  }
}

export function fromSessionInput(input: LessonSessionInput) {
  const at = (date: string, time: string) =>
    input.allDay ? `${date} 00:00:00` : `${date} ${time.length === 5 ? `${time}:00` : time}`
  return {
    startsAt: at(input.date, input.startTime),
    endsAt: at(effectiveEndDate(input), input.endTime),
    allDay: input.allDay ? 1 : 0,
  }
}

/** '' for a lesson with no sessions, which sorts such lessons first. */
export function firstSessionStart(sessions: LessonSession[]): string {
  return sessions.reduce((min, s) => (!min || s.startsAt < min ? s.startsAt : min), '')
}

/**
 * Stands in for `ORDER BY CalendarDate, time`, which sorted the time column's prose
 * alphabetically. Done in TS because every list that needs it is unpaginated.
 */
export function byDateThenStart(
  a: Pick<RichLesson, 'calendarDate' | 'sessions'>,
  b: Pick<RichLesson, 'calendarDate' | 'sessions'>,
): number {
  return (
    a.calendarDate.localeCompare(b.calendarDate) ||
    firstSessionStart(a.sessions).localeCompare(firstSessionStart(b.sessions))
  )
}

export function toRichLesson(row: LessonQueryRow, sessions: LessonSession[]): RichLesson {
  return {
    index: row.index,
    classTypeId: num(row.typeId),
    instructor1: num(row.instructor1),
    instructor2: num(row.instructor2),
    expire: num(row.expire),
    type: row.type ?? '<Unknown>',
    subtype: str(row.subtype),
    sessions,
    calendarDate: row.calendarDate,
    instructor1Name: fullName(row.instructor1First, row.instructor1Last) || '<Unknown>',
    instructor2Name: fullName(row.instructor2First, row.instructor2Last),
    comments: str(row.comments),
    requirements: str(row.requirements),
    location: str(row.location),
    locationUrl: str(row.locationUrl),
    size: num(row.size),
    display: row.display !== 0,
  }
}

/** Lesson columns only; session rows are written separately. */
export function fromLessonInsert(data: LessonInsert) {
  return {
    type: data.classTypeId,
    subtype: data.subtype,
    calendarDate: lastSessionDate(data.sessions),
    instructor1: data.instructor1,
    instructor2: data.instructor2,
    comments: data.comments,
    requirements: data.requirements,
    location: data.location,
    locationUrl: data.locationUrl,
    size: data.size,
    expire: data.expire,
    display: data.display ? 1 : 0,
  }
}
