import db from '@/db/index'
import { lessonSessions, lessons, signups, wycDatabase } from '@/db/schema'
import { splitEnrollment } from '@/db/signup-utils'
import {
  allInstructorIds,
  baseLessonQuery,
  fetchInstructorEmails,
  fetchSessionsByLesson,
  toLessonEmailInfo,
} from '@/domains/lessons/queries'
import { toRichLesson } from '@/domains/lessons/schema'
import { pacificDatePlusDays } from '@/lib/date-utils'
import { sendEmailBatch, type BatchMessage } from '@/lib/email'
import { lessonReminderEmail, lessonReminderSubject } from '@/lib/email-templates'
import { isDevEnvironment } from '@/lib/env'
import { and, asc, eq, inArray, sql } from 'drizzle-orm'

export const REMINDER_DAYS_AHEAD = 2

export type ReminderPlan = {
  targetDate: string
  daysAhead: number
  dryRun: boolean
  simulated: boolean
  sent: number
  lessons: Array<{
    index: number
    subtype: string
    recipients: string[]
    skippedNoEmail: number[]
  }>
}

// First session, not every session: unenrolling drops the whole lesson, so there is nothing
// to act on once it has started.
async function lessonIdsStartingOn(date: string): Promise<number[]> {
  const rows = await db
    .select({ lessonId: lessonSessions.lessonId })
    .from(lessonSessions)
    .groupBy(lessonSessions.lessonId)
    .having(sql`date(min(${lessonSessions.startsAt})) = ${date}`)
  return rows.map((r) => r.lessonId)
}

async function fetchSignupsByLesson(lessonIds: number[]) {
  const rows = await db
    .select({
      class: signups.class,
      wycNumber: wycDatabase.wycNumber,
      first: wycDatabase.first,
      last: wycDatabase.last,
      email: wycDatabase.email,
    })
    .from(signups)
    .innerJoin(wycDatabase, eq(signups.student, wycDatabase.wycNumber))
    .where(inArray(signups.class, lessonIds))
    .orderBy(asc(signups.index))

  const byLesson = new Map<number, typeof rows>()
  for (const row of rows) {
    const arr = byLesson.get(row.class) ?? []
    arr.push(row)
    byLesson.set(row.class, arr)
  }
  return byLesson
}

export async function sendLessonReminders({
  daysAhead = REMINDER_DAYS_AHEAD,
  dryRun = false,
}: { daysAhead?: number; dryRun?: boolean } = {}): Promise<ReminderPlan> {
  const targetDate = pacificDatePlusDays(daysAhead)
  const empty: ReminderPlan = {
    targetDate,
    daysAhead,
    dryRun,
    simulated: isDevEnvironment(),
    sent: 0,
    lessons: [],
  }

  const startingIds = await lessonIdsStartingOn(targetDate)
  if (startingIds.length === 0) return empty

  const lessonRows = await baseLessonQuery().where(
    and(inArray(lessons.index, startingIds), eq(lessons.display, 1)),
  )
  if (lessonRows.length === 0) return empty

  const lessonIds = lessonRows.map((r) => r.index)
  const [sessionsByLesson, signupsByLesson, instructorEmails] = await Promise.all([
    fetchSessionsByLesson(lessonIds),
    fetchSignupsByLesson(lessonIds),
    fetchInstructorEmails(allInstructorIds(lessonRows)),
  ])

  const messages: BatchMessage[] = []
  const report: ReminderPlan['lessons'] = []

  for (const row of lessonRows) {
    const lesson = toRichLesson(row, sessionsByLesson.get(row.index) ?? [])
    const { enrolled } = splitEnrollment(signupsByLesson.get(row.index) ?? [], lesson.size)
    if (enrolled.length === 0) continue

    const info = toLessonEmailInfo(lesson, instructorEmails)
    const recipients: string[] = []
    const skippedNoEmail: number[] = []

    for (const student of enrolled) {
      if (!student.email) {
        skippedNoEmail.push(student.wycNumber)
        continue
      }
      const name = `${student.first ?? ''} ${student.last ?? ''}`.trim() || 'Member'
      recipients.push(student.email)
      messages.push({
        to: student.email,
        subject: lessonReminderSubject,
        text: lessonReminderEmail(name, info, daysAhead),
      })
    }

    report.push({ index: lesson.index, subtype: lesson.subtype, recipients, skippedNoEmail })
  }

  if (dryRun || messages.length === 0) return { ...empty, lessons: report }

  // Keyed by date, not by run, so Vercel firing the cron twice in a day sends once.
  const { ids, simulated } = await sendEmailBatch(messages, `lesson-reminders/${targetDate}`)
  return { ...empty, simulated, sent: ids.length, lessons: report }
}
