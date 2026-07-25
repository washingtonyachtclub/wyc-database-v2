import { formatSessions } from '@/domains/lessons/format-sessions'
import type { LessonSession } from '@/domains/lessons/schema'

export type LessonEmailInfo = {
  type: string
  typeId: number
  subtype: string
  sessions: LessonSession[]
  instructor1Name: string
  instructor1Email: string
  instructor2Name: string
  instructor2Email: string
  location: string
  locationUrl: string
}

function formatLessonInfo(lesson: LessonEmailInfo): string {
  const sessionLines = formatSessions(lesson.sessions)
  const lines = [`Class: ${lesson.subtype}`]
  if (sessionLines.length === 1) lines.push(`When: ${sessionLines[0]}`)
  else if (sessionLines.length > 1) lines.push('When:', ...sessionLines.map((l) => `  ${l}`))
  if (lesson.location) {
    lines.push(
      `Location: ${lesson.location}${lesson.locationUrl ? ` (${lesson.locationUrl})` : ''}`,
    )
  }
  lines.push(
    `Instructor: ${lesson.instructor1Name}${lesson.instructor1Email ? ` (${lesson.instructor1Email})` : ''}`,
  )
  if (lesson.instructor2Name) {
    lines.push(
      `Instructor: ${lesson.instructor2Name}${lesson.instructor2Email ? ` (${lesson.instructor2Email})` : ''}`,
    )
  }
  return lines.join('\n')
}

const PLEASE_UNENROLL = `If you can no longer make it, please unenroll at database.washingtonyachtclub.org/my-lessons as soon as you can. Classes fill up, and dropping frees your spot for the next person on the waitlist.`

// class_type indices: NOV Dinghy Weekday (1), NOV Dinghy Weekend (2), Catamaran (3), Dinghy Sailing (10)
const GUIDE_TYPE_IDS = new Set([1, 2, 3, 10])

const READ_THE_GUIDE = `If you haven't already, read our sailing guide at washingtonyachtclub.org/guides. It covers the basics of sailing and what to wear and bring.`

function guideLine(lesson: LessonEmailInfo): string {
  return GUIDE_TYPE_IDS.has(lesson.typeId) ? `\n\n${READ_THE_GUIDE}` : ''
}

// TODO: Subject lines should live alongside templates, not in server functions
export function lessonEnrolledEmail(
  studentName: string,
  lesson: LessonEmailInfo,
  fromWaitlist?: boolean,
): string {
  const intro = fromWaitlist
    ? 'A spot has opened up — you are now enrolled in the following class:'
    : 'You have been enrolled in the following class:'

  return `Hello ${studentName},

${intro}

${formatLessonInfo(lesson)}

${PLEASE_UNENROLL}${guideLine(lesson)}`
}

export const lessonReminderSubject = 'WYC - Your upcoming lesson'

export function lessonReminderEmail(
  studentName: string,
  lesson: LessonEmailInfo,
  daysAhead: number,
): string {
  const when = daysAhead === 0 ? 'today' : daysAhead === 1 ? 'tomorrow' : `in ${daysAhead} days`

  return `Hello ${studentName},

This is a reminder that your WYC lesson is ${when}:

${formatLessonInfo(lesson)}

${PLEASE_UNENROLL}${guideLine(lesson)}`
}

export function lessonWaitlistedEmail(studentName: string, lesson: LessonEmailInfo): string {
  return `Hello ${studentName},

The class you signed up for is currently full. You have been added to the waitlist for:

${formatLessonInfo(lesson)}

If enough students drop the class, you will automatically be enrolled.

You can check your waitlist status or drop the class at database.washingtonyachtclub.org/my-lessons.
`
}
