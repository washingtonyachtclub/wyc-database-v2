import { emailLink, emailTextToHtml } from './html'
import { PUBLIC_APP_ORIGIN } from '@/lib/urls'

import { formatSessions } from '@/domains/lessons/format-sessions'
import type { LessonSession } from '@/domains/lessons/schema'

export type LessonEmailInfo = {
  type: string
  typeId: number
  size: number
  subtype: string
  sessions: LessonSession[]
  instructor1Name: string
  instructor1Email: string
  instructor2Name: string
  instructor2Email: string
  location: string
  locationUrl: string
}

type EmailFormat = {
  text: (value: string) => string
  link: (url: string, label: string) => string
}

const plainTextFormat: EmailFormat = {
  text: (value) => value,
  link: (url, label) => `${label} (${url})`,
}

const htmlFormat: EmailFormat = {
  text: emailTextToHtml,
  link: emailLink,
}

function renderEmail(render: (format: EmailFormat) => string) {
  return {
    text: render(plainTextFormat),
    html: `<div style="font-family:Arial,sans-serif;line-height:1.5">${render(htmlFormat).replaceAll('\n', '<br>')}</div>`,
  }
}

function formatLessonInfo(lesson: LessonEmailInfo, format: EmailFormat): string {
  const sessionLines = formatSessions(lesson.sessions)
  const lines = [`Class: ${format.text(lesson.subtype)}`]
  if (sessionLines.length === 1) lines.push(`When: ${format.text(sessionLines[0])}`)
  else if (sessionLines.length > 1)
    lines.push('When:', ...sessionLines.map((l) => `  ${format.text(l)}`))
  if (lesson.location) {
    lines.push(
      `Location: ${lesson.locationUrl ? format.link(lesson.locationUrl, lesson.location) : format.text(lesson.location)}`,
    )
  }
  lines.push(
    `Instructor: ${format.text(lesson.instructor1Name)}${lesson.instructor1Email ? ` (${format.text(lesson.instructor1Email)})` : ''}`,
  )
  if (lesson.instructor2Name) {
    lines.push(
      `Instructor: ${format.text(lesson.instructor2Name)}${lesson.instructor2Email ? ` (${format.text(lesson.instructor2Email)})` : ''}`,
    )
  }
  return lines.join('\n')
}

function unenrollLine(lesson: LessonEmailInfo): string {
  const instruction = `If you can no longer make it, please unenroll at ${PUBLIC_APP_ORIGIN}/my-lessons as soon as you can.`
  return lesson.size === 0
    ? instruction
    : `${instruction} Classes fill up, and dropping frees your spot for the next person on the waitlist.`
}

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
  announcementsUrl?: string,
) {
  const intro = fromWaitlist
    ? 'A spot has opened up — you are now enrolled in the following class:'
    : 'You have been enrolled in the following class:'

  return renderEmail(
    (format) => `Hello ${format.text(studentName)},

${intro}

${formatLessonInfo(lesson, format)}

${format.text(unenrollLine(lesson))}${
      announcementsUrl
        ? `\n\nThis lesson has announcements that may contain required information. Review all of them before attending:\n${format.text(announcementsUrl)}`
        : ''
    }${format.text(guideLine(lesson))}`,
  )
}

export const lessonReminderSubject = 'WYC - Your upcoming lesson'

export function lessonReminderEmail(
  studentName: string,
  lesson: LessonEmailInfo,
  daysAhead: number,
) {
  const when = daysAhead === 0 ? 'today' : daysAhead === 1 ? 'tomorrow' : `in ${daysAhead} days`

  return renderEmail(
    (format) => `Hello ${format.text(studentName)},

This is a reminder that your WYC lesson is ${when}:

${formatLessonInfo(lesson, format)}

${format.text(unenrollLine(lesson))}${format.text(guideLine(lesson))}`,
  )
}

export function lessonWaitlistedEmail(studentName: string, lesson: LessonEmailInfo) {
  return renderEmail(
    (format) => `Hello ${format.text(studentName)},

The class you signed up for is currently full. You have been added to the waitlist for:

${formatLessonInfo(lesson, format)}

If enough students drop the class, you will automatically be enrolled.

You can check your waitlist status or drop the class at ${format.text(`${PUBLIC_APP_ORIGIN}/my-lessons`)}.
`,
  )
}
