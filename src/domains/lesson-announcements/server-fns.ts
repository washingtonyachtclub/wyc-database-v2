import db from '@/db/index'
import { lessonAnnouncements, lessons, signups } from '@/db/schema'
import { enrollmentStatus } from '@/db/signup-utils'
import { baseLessonQuery, fetchLessonSessions } from '@/domains/lessons/queries'
import { toRichLesson } from '@/domains/lessons/schema'
import {
  requireAuth,
  requireInstructorOrPrivilege,
  sessionHasPrivilege,
} from '@/lib/auth/auth-middleware'
import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq } from 'drizzle-orm'
import { publishLessonAnnouncement } from './publish'
import { fetchLessonAnnouncements } from './queries'
import { postLessonAnnouncementSchema, toLessonAnnouncement } from './schema'

async function fetchAccessibleLesson(lessonId: number, userId: number) {
  const [lessonRow, [signup], isDatabaseAdmin, isRatingsManager] = await Promise.all([
    baseLessonQuery()
      .where(eq(lessons.index, lessonId))
      .then((rows) => rows[0]),
    db
      .select({ index: signups.index })
      .from(signups)
      .where(and(eq(signups.class, lessonId), eq(signups.student, userId)))
      .limit(1),
    sessionHasPrivilege('db'),
    sessionHasPrivilege('rtgs'),
  ])

  if (!lessonRow) return null

  const isInstructor = lessonRow.instructor1 === userId || lessonRow.instructor2 === userId

  return {
    lessonRow,
    signupIndex: signup?.index ?? null,
    canViewAnnouncements: Boolean(signup) || isInstructor || isDatabaseAdmin,
    canManageLesson: isInstructor || isDatabaseAdmin || isRatingsManager,
  }
}

export const getLessonAnnouncements = createServerFn({ method: 'GET' })
  .inputValidator((input: { lessonId: number }) => ({ lessonId: Number(input.lessonId) }))
  .handler(async ({ data: { lessonId } }) => {
    const userId = await requireAuth()
    try {
      const access = await fetchAccessibleLesson(lessonId, userId)
      if (!access?.canViewAnnouncements) throw new Error('Lesson announcements are not available')

      const rows = await fetchLessonAnnouncements(lessonId)
      return rows.map(toLessonAnnouncement)
    } catch (error) {
      console.error('Failed to load lesson announcements', lessonId, error)
      throw new Error('Failed to load lesson announcements')
    }
  })

export const getMemberLessonPage = createServerFn({ method: 'GET' })
  .inputValidator((input: { lessonId: number }) => ({ lessonId: Number(input.lessonId) }))
  .handler(async ({ data: { lessonId } }) => {
    const userId = await requireAuth()
    try {
      const access = await fetchAccessibleLesson(lessonId, userId)
      if (!access || (access.signupIndex === null && !access.canManageLesson)) return null

      const [sessions, announcementRows, signupRows] = await Promise.all([
        fetchLessonSessions(lessonId),
        access.canViewAnnouncements ? fetchLessonAnnouncements(lessonId) : Promise.resolve([]),
        access.signupIndex === null
          ? Promise.resolve([])
          : db
              .select({ index: signups.index })
              .from(signups)
              .where(eq(signups.class, lessonId))
              .orderBy(asc(signups.index)),
      ])

      const lesson = toRichLesson(access.lessonRow, sessions)
      const position = signupRows.findIndex((row) => row.index === access.signupIndex)

      return {
        lesson,
        status: position === -1 ? null : enrollmentStatus(position, lesson.size),
        announcements: announcementRows.map(toLessonAnnouncement),
        canManageLesson: access.canManageLesson,
      }
    } catch (error) {
      console.error('Failed to load member lesson page', lessonId, error)
      throw new Error('Failed to load lesson')
    }
  })

export const postLessonAnnouncement = createServerFn({ method: 'POST' })
  .inputValidator((input) => postLessonAnnouncementSchema.parse(input))
  .handler(async ({ data }) => {
    const authorWycNumber = await requireInstructorOrPrivilege(data.lessonId, 'db')

    try {
      return await publishLessonAnnouncement({ ...data, authorWycNumber })
    } catch (error) {
      console.error('Failed to post lesson announcement', error)
      throw new Error('Failed to post lesson announcement')
    }
  })

export const deleteLessonAnnouncement = createServerFn({ method: 'POST' })
  .inputValidator((input: { announcementId: number }) => ({
    announcementId: Number(input.announcementId),
  }))
  .handler(async ({ data: { announcementId } }) => {
    try {
      const [announcement] = await db
        .select({ lessonId: lessonAnnouncements.lessonId })
        .from(lessonAnnouncements)
        .where(eq(lessonAnnouncements.id, announcementId))
        .limit(1)
      if (!announcement) throw new Error('Announcement not found')

      await requireInstructorOrPrivilege(announcement.lessonId, 'db')
      await db.delete(lessonAnnouncements).where(eq(lessonAnnouncements.id, announcementId))
      return { success: true }
    } catch (error) {
      console.error('Failed to delete lesson announcement', error)
      throw new Error('Failed to delete lesson announcement')
    }
  })
