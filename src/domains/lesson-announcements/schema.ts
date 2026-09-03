import { fullName, str } from '@/db/mapper-utils'
import type { LessonAnnouncementQueryRow } from './queries'
import { z } from 'zod'

export const DEFAULT_LESSON_ANNOUNCEMENT_SUBJECT = 'WYC - Announcement for your upcoming lesson'
export const LESSON_ANNOUNCEMENT_BODY_LIMIT = 10_000

export const postLessonAnnouncementSchema = z.object({
  lessonId: z.number().int().positive(),
  subject: z.string(),
  bodyMarkdown: z
    .string()
    .trim()
    .min(1, 'Announcement is required')
    .max(
      LESSON_ANNOUNCEMENT_BODY_LIMIT,
      `Announcement must be ${LESSON_ANNOUNCEMENT_BODY_LIMIT.toLocaleString()} characters or fewer`,
    ),
  emailEnrolled: z.boolean(),
  emailWaitlisted: z.boolean(),
})

export type PostLessonAnnouncementInput = z.infer<typeof postLessonAnnouncementSchema>

export type LessonAnnouncement = {
  id: number
  lessonId: number
  authorWycNumber: number | null
  authorName: string
  subject: string
  bodyMarkdown: string
  createdAt: string
}

export function toLessonAnnouncement(row: LessonAnnouncementQueryRow): LessonAnnouncement {
  return {
    id: row.id,
    lessonId: row.lessonId,
    authorWycNumber: row.authorWycNumber,
    authorName:
      row.authorWycNumber === null
        ? 'WYC Database'
        : fullName(row.authorFirst, row.authorLast) || '<Unknown>',
    subject: str(row.subject),
    bodyMarkdown: str(row.bodyMarkdown),
    createdAt: row.createdAt,
  }
}
