import { formatSessions } from '@/domains/lessons/format-sessions'
import type { LessonSession } from '@/domains/lessons/schema'

const SIGNATURE_NAME = 'Eshan Arora'
const SIGNATURE_POSITION = 'Webmaster, WYC'

// --- Membership processing ---

export function newMemberEmail(
  member: { first: string; last: string; wycNumber: number },
  password: string,
): string {
  return `Hello ${member.first} ${member.last},

Welcome to the WYC!

Your WYC Number is: ${member.wycNumber}
Your Temporary Password is: ${password}

You may use these to sign up for lessons at: washingtonyachtclub.org/lessons-events/sign-up-for-lessons

Sign out a boat at: checkout.washingtonyachtclub.org
Or access our database at: database.washingtonyachtclub.org

The password is unique and you can reset it in the database.

Want to start learning immediately? Check our guides: washingtonyachtclub.org/guides

And here is our discord in case you don't have it already: discord.gg/JRQECaeYKN
It is definitely the best way to keep up with everything the club is up to.

If you have any questions feel free to ask in discord!

${SIGNATURE_NAME}
${SIGNATURE_POSITION}`
}

export function newMemberEmailFallback(member: {
  first: string
  last: string
  wycNumber: number
}): string {
  return `Hello ${member.first} ${member.last},

Welcome to the WYC!

Your WYC Number is: ${member.wycNumber}

To get started, go to database.washingtonyachtclub.org and use "Forgot Password" to set your password.

Sign up for lessons at: washingtonyachtclub.org/lessons-events/sign-up-for-lessons
Check out a boat at: checkout.washingtonyachtclub.org

Want to start learning immediately? Check our guides: washingtonyachtclub.org/guides

And here is our discord in case you don't have it already: discord.gg/JRQECaeYKN
It is definitely the best way to keep up with everything the club is up to.

If you have any questions feel free to ask in discord!

${SIGNATURE_NAME}
${SIGNATURE_POSITION}`
}

export function returningMemberEmail(
  first: string,
  last: string,
  wycNumber: number,
  newExpireQtrSchoolText: string,
  emailMismatch?: { formEmail: string; onFileEmail: string },
): string {
  const mismatchNote = emailMismatch
    ? `\nNote: You renewed with the email ${emailMismatch.formEmail}, but we have ${emailMismatch.onFileEmail} on file. You can update your email at database.washingtonyachtclub.org.\n`
    : ''

  return `Hello ${first} ${last},

Your WYC membership has been renewed!

Your WYC Number is: ${wycNumber}
Your membership is now active through ${newExpireQtrSchoolText}.
You can review your ratings and information at database.washingtonyachtclub.org.
${mismatchNote}`
}

// --- Password / account recovery ---

export function passwordResetEmail(name: string, wycNumber: number, passphrase: string): string {
  return `Hello ${name},

Your password has been reset.

Your WYC Number is: ${wycNumber}
Your Temporary Password is: ${passphrase}

Please log in and set a new password at your earliest convenience.`
}

export function loginOtpEmail(name: string, code: string, expiresInMinutes: number): string {
  return `Hello ${name},

Your WYC login code is: ${code}

This code expires in ${expiresInMinutes} minutes.

If you did not request this code, you can safely ignore this email.`
}

export function wycNumberLookupEmail(
  email: string,
  members: { wycNumber: number; name: string }[],
): string {
  const memberLines = members.map((m) => `  ${m.name} — WYC #${m.wycNumber}`).join('\n')

  return `Hello,

Here is the WYC number associated with ${email}:

${memberLines}

You can reset your password on the database if needed.`
}

// --- Lesson signup ---

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
