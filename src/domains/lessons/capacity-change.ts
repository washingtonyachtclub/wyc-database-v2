import { randomUUID } from 'node:crypto'
import { splitEnrollment } from '@/db/signup-utils'
import { RESEND_BATCH_LIMIT, sendEmailBatch } from '@/lib/email'
import {
  lessonEnrolledEmail,
  lessonWaitlistedByCapacityEmail,
  lessonWaitlistedByCapacitySubject,
  lessonWaitlistPromotionSubject,
  type LessonEmailInfo,
} from '@/lib/emails/lessons'
import type { LessonStudent } from './schema'

type EnrollmentChange = {
  student: LessonStudent
  status: 'enrolled' | 'waitlisted'
}

export type LessonCapacityPreview = {
  currentSize: number
  nextSize: number
  changes: {
    wycNumber: number
    name: string
    status: EnrollmentChange['status']
  }[]
}

function studentName(student: LessonStudent) {
  return `${student.first} ${student.last}`.trim() || 'Member'
}

export function getLessonCapacityChange(
  students: LessonStudent[],
  currentSize: number,
  nextSize: number,
): { changes: EnrollmentChange[]; preview: LessonCapacityPreview } {
  const currentCount = splitEnrollment(students, currentSize).enrolled.length
  const nextCount = splitEnrollment(students, nextSize).enrolled.length
  const status = nextCount > currentCount ? 'enrolled' : 'waitlisted'
  const affected = students.slice(
    Math.min(currentCount, nextCount),
    Math.max(currentCount, nextCount),
  )

  return {
    changes: affected.map((student) => ({ student, status })),
    preview: {
      currentSize,
      nextSize,
      changes: affected.map((student) => ({
        wycNumber: student.wycNumber,
        name: studentName(student),
        status,
      })),
    },
  }
}

export async function sendLessonCapacityEmails(
  lessonId: number,
  lesson: LessonEmailInfo,
  changes: EnrollmentChange[],
  announcementsUrl?: string,
) {
  const key = `lesson-capacity/${lessonId}/${randomUUID()}`
  const failed: string[] = []
  let simulated = false
  const recipients = changes.filter(({ student }) => {
    if (student.email.trim()) return true
    failed.push(studentName(student))
    return false
  })

  for (let offset = 0; offset < recipients.length; offset += RESEND_BATCH_LIMIT) {
    const batch = recipients.slice(offset, offset + RESEND_BATCH_LIMIT)
    try {
      const result = await sendEmailBatch(
        batch.map(({ student, status }) => {
          const name = studentName(student)
          return {
            to: student.email.trim(),
            ...(status === 'enrolled'
              ? {
                  subject: lessonWaitlistPromotionSubject,
                  ...lessonEnrolledEmail(name, lesson, true, announcementsUrl),
                }
              : {
                  subject: lessonWaitlistedByCapacitySubject,
                  ...lessonWaitlistedByCapacityEmail(name, lesson),
                }),
          }
        }),
        `${key}/${offset}`,
      )
      simulated ||= result.simulated
    } catch (error) {
      console.error('Failed to send lesson capacity emails', lessonId, error)
      failed.push(...batch.map(({ student }) => studentName(student)))
    }
  }

  return { failed, simulated, sentCount: changes.length - failed.length }
}
