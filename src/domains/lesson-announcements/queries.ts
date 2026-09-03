import db from '@/db/index'
import { lessonAnnouncements, wycDatabase } from '@/db/schema'
import { asc, eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/mysql-core'

const announcementAuthor = alias(wycDatabase, 'announcement_author')

const announcementSelectFields = {
  id: lessonAnnouncements.id,
  lessonId: lessonAnnouncements.lessonId,
  authorWycNumber: lessonAnnouncements.authorWycNumber,
  authorFirst: announcementAuthor.first,
  authorLast: announcementAuthor.last,
  subject: lessonAnnouncements.subject,
  bodyMarkdown: lessonAnnouncements.bodyMarkdown,
  createdAt: lessonAnnouncements.createdAt,
}

export function baseLessonAnnouncementQuery() {
  return db
    .select(announcementSelectFields)
    .from(lessonAnnouncements)
    .leftJoin(
      announcementAuthor,
      eq(lessonAnnouncements.authorWycNumber, announcementAuthor.wycNumber),
    )
}

export type LessonAnnouncementQueryRow = Awaited<
  ReturnType<typeof baseLessonAnnouncementQuery>
>[number]

export async function fetchLessonAnnouncements(lessonId: number) {
  return baseLessonAnnouncementQuery()
    .where(eq(lessonAnnouncements.lessonId, lessonId))
    .orderBy(asc(lessonAnnouncements.createdAt), asc(lessonAnnouncements.id))
}
