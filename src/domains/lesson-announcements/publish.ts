import db from '@/db/index'
import { lessonAnnouncements, lessons } from '@/db/schema'
import { splitEnrollment } from '@/db/signup-utils'
import {
  baseLessonQuery,
  fetchInstructorEmails,
  fetchLessonSessions,
  fetchLessonStudents,
} from '@/domains/lessons/queries'
import { toRichLesson } from '@/domains/lessons/schema'
import { sendEmail } from '@/lib/email'
import { eq } from 'drizzle-orm'
import { lessonAnnouncementEmail } from './email'
import { baseLessonAnnouncementQuery } from './queries'
import {
  DEFAULT_LESSON_ANNOUNCEMENT_SUBJECT,
  type PostLessonAnnouncementInput,
  toLessonAnnouncement,
} from './schema'

const ANNOUNCEMENT_TO_EMAIL = 'vicecommodore@washingtonyachtclub.org'

export async function publishLessonAnnouncement(
  data: PostLessonAnnouncementInput & { authorWycNumber: number | null },
) {
  const subject = data.subject.trim() || DEFAULT_LESSON_ANNOUNCEMENT_SUBJECT
  const [lessonRow] = await baseLessonQuery().where(eq(lessons.index, data.lessonId))
  if (!lessonRow) throw new Error('Lesson not found')

  const [result] = await db.insert(lessonAnnouncements).values({
    lessonId: data.lessonId,
    authorWycNumber: data.authorWycNumber,
    subject,
    bodyMarkdown: data.bodyMarkdown,
  })
  const [announcementRow] = await baseLessonAnnouncementQuery().where(
    eq(lessonAnnouncements.id, result.insertId),
  )
  if (!announcementRow) throw new Error('Failed to load announcement')

  const announcement = toLessonAnnouncement(announcementRow)
  const emailRequested = data.emailEnrolled || data.emailWaitlisted
  if (!emailRequested) {
    return {
      announcement,
      emailRequested: false,
      emailSent: false,
      emailFailed: false,
      emailSimulated: false,
      memberRecipientCount: 0,
      missingMemberEmailCount: 0,
      instructorCopyCount: 0,
    }
  }

  try {
    const [sessions, students] = await Promise.all([
      fetchLessonSessions(data.lessonId),
      fetchLessonStudents(data.lessonId),
    ])
    const lesson = toRichLesson(lessonRow, sessions)
    const roster = splitEnrollment(students, lesson.size)
    const selectedStudents = [
      ...(data.emailEnrolled ? roster.enrolled : []),
      ...(data.emailWaitlisted ? roster.waitlisted : []),
    ]
    const memberRecipients = selectedStudents.filter((student) => student.email.trim())
    const missingMemberEmailCount = selectedStudents.length - memberRecipients.length

    if (memberRecipients.length === 0) {
      return {
        announcement,
        emailRequested: true,
        emailSent: false,
        emailFailed: false,
        emailSimulated: false,
        memberRecipientCount: 0,
        missingMemberEmailCount,
        instructorCopyCount: 0,
      }
    }

    const content = await lessonAnnouncementEmail(lesson, subject, data.bodyMarkdown)
    const recipientEmails = new Map<string, string>()
    for (const student of memberRecipients) {
      recipientEmails.set(student.email.trim().toLowerCase(), student.email.trim())
    }

    const instructorEmails = await fetchInstructorEmails(
      [lesson.instructor1, lesson.instructor2].filter(
        (id): id is number => id !== null && id !== 0,
      ),
    )
    let instructorCopyCount = 0
    for (const email of instructorEmails.values()) {
      const normalized = email.trim().toLowerCase()
      if (!normalized || recipientEmails.has(normalized)) continue
      recipientEmails.set(normalized, email.trim())
      instructorCopyCount += 1
    }

    recipientEmails.delete(ANNOUNCEMENT_TO_EMAIL.toLowerCase())
    const emailResult = await sendEmail({
      to: ANNOUNCEMENT_TO_EMAIL,
      bcc: [...recipientEmails.values()],
      subject,
      ...content,
      idempotencyKey: `lesson-announcement/${result.insertId}`,
    })
    return {
      announcement,
      emailRequested: true,
      emailSent: true,
      emailFailed: false,
      emailSimulated: emailResult.simulated,
      memberRecipientCount: memberRecipients.length,
      missingMemberEmailCount,
      instructorCopyCount,
    }
  } catch (error) {
    console.error('Failed to email lesson announcement', result.insertId, error)
    return {
      announcement,
      emailRequested: true,
      emailSent: false,
      emailFailed: true,
      emailSimulated: false,
      memberRecipientCount: 0,
      missingMemberEmailCount: 0,
      instructorCopyCount: 0,
    }
  }
}
