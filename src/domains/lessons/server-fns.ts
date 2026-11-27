import { atomicWrite, type AtomicWrite } from '@/db/atomic'
import { lessonQuarterAtLeast } from '@/domains/lessons/quarter-query'
import db from '@/db/index'
import { listPublicLessons } from '@/domains/lessons/public-lessons'
import { isMembershipActive } from '@/db/membership-utils'
import { inIdList, withPagination, withSorting } from '@/db/query-helpers'
import {
  lessonAnnouncements,
  lessonQuarter,
  lessonSessions,
  lessons,
  quarters,
  signups,
  wycDatabase,
} from '@/db/schema'
import { enrollmentStatus, splitEnrollment } from '@/db/signup-utils'
import type { LessonFilters } from '@/domains/lessons/filter-types'
import { resolveLessonQuarter } from '@/domains/lessons/quarter-rules'
import {
  baseLessonQuery,
  baseSignedUpWithDetailsQuery,
  fetchLessonEmailInfo,
  fetchLessonSessions,
  fetchLessonStudents,
  fetchSessionsByLesson,
  insertEligibleSignup,
  lessonSortColumns,
  withLessonFilters,
} from '@/domains/lessons/queries'
import type { LessonInsert, LessonSessionInput, SignedUpLesson } from '@/domains/lessons/schema'
import {
  byDateThenStart,
  fromLessonInsert,
  fromSessionInput,
  lastSessionDate,
  lessonInsertSchema,
  toRichLesson,
} from '@/domains/lessons/schema'
import { requireAuth, requireLessonManagement, requirePrivilege } from '@/lib/auth/auth-middleware'
import { sendEmail } from '@/lib/email'
import {
  lessonEnrolledEmail,
  lessonWaitlistedEmail,
  lessonWaitlistPromotionSubject,
} from '@/lib/emails/lessons'
import { lessonPageUrl } from '@/domains/lesson-announcements/email'
import { deleteSessionEvent, gcalEnabled } from '@/lib/gcal'
import { calendarLessonIds, syncLessonCalendar } from './calendar'
import { getLessonCapacityChange, sendLessonCapacityEmails } from './capacity-change'
import { CALENDAR_SYNC_START_DATE, lessonSignupsOpen } from './visibility'
import { getTodayPacificDateString } from '@/lib/date-utils'
import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, eq, or } from 'drizzle-orm'
import { z } from 'zod'

export const getPublicLessons = createServerFn({ method: 'GET' }).handler(async () => {
  return listPublicLessons(getTodayPacificDateString())
})

export const getQuarterLessons = createServerFn({ method: 'GET' }).handler(async () => {
  const userId = await requirePrivilege('db')
  const currentQuarter = await getCurrentQuarter()

  const raw = await baseLessonQuery()
    .where(lessonQuarterAtLeast(currentQuarter))
    .orderBy(asc(lessons.calendarDate))

  const lessonIds = raw.map((r) => r.index)
  let enrollmentCounts = new Map<number, number>()
  if (lessonIds.length > 0) {
    const counts = await db
      .select({ class: signups.class, count: count() })
      .from(signups)
      .where(inIdList(signups.class, lessonIds))
      .groupBy(signups.class)
    enrollmentCounts = new Map(counts.map((c) => [c.class, c.count]))
  }

  const sessionsByLesson = await fetchSessionsByLesson(lessonIds)

  const data = raw
    .map((row) => ({
      ...toRichLesson(row, sessionsByLesson.get(row.index) ?? []),
      enrolledCount: enrollmentCounts.get(row.index) ?? 0,
    }))
    .sort(byDateThenStart)

  return { data, currentQuarter, userId }
})

export const getCurrentQuarter = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAuth()
  const quarterRow = await db
    .select({ quarter: lessonQuarter.quarter })
    .from(lessonQuarter)
    .where(eq(lessonQuarter.index, 1))
    .limit(1)
  return quarterRow[0].quarter
})

export const getAllLessons = createServerFn({ method: 'GET' })
  .validator(
    (input: {
      pageIndex: number
      pageSize: number
      filters?: LessonFilters
      sorting?: { id: string; desc: boolean }
    }) => ({
      pageIndex: input.pageIndex,
      pageSize: input.pageSize,
      filters: input.filters,
      sorting: input.sorting,
    }),
  )
  .handler(async ({ data: { pageIndex, pageSize, filters, sorting } }) => {
    await requirePrivilege('db')

    const query = baseLessonQuery().$dynamic()

    withLessonFilters(query, filters)
    withSorting(query, sorting, lessonSortColumns, lessons.index)
    withPagination(query, pageIndex, pageSize)

    const raw = await query
    const sessionsByLesson = await fetchSessionsByLesson(raw.map((r) => r.index))
    const data = raw.map((row) => toRichLesson(row, sessionsByLesson.get(row.index) ?? []))

    const countQuery = db.select({ count: count() }).from(lessons).$dynamic()
    withLessonFilters(countQuery, filters)
    const [totalCountResult] = await countQuery

    return { data, totalCount: totalCountResult.count }
  })

async function fetchQuarterDates() {
  const rows = await db
    .select({ index: quarters.index, school: quarters.school, endDate: quarters.endDate })
    .from(quarters)
  return rows.map((q) => ({ index: q.index, school: q.school ?? '', endDate: q.endDate ?? '' }))
}

// Internal helper — no auth check. Used by getLessonById and removeStudentFromLesson.
async function fetchLessonDetails(id: number) {
  const [lessonRow] = await baseLessonQuery().where(eq(lessons.index, id))
  if (!lessonRow) return null

  const lesson = toRichLesson(lessonRow, await fetchLessonSessions(id))
  const lessonStudents = await fetchLessonStudents(id)

  const { enrolled: enrolledStudents, waitlisted: waitlistedStudents } = splitEnrollment(
    lessonStudents,
    lesson.size,
  )

  return { lesson, enrolledStudents, waitlistedStudents }
}

export const getLessonById = createServerFn({ method: 'GET' })
  .validator((input: { id: number }) => ({ id: input.id }))
  .handler(async ({ data: { id } }) => {
    await requireLessonManagement(id)
    return fetchLessonDetails(id)
  })

// Deltas rather than wipe-and-reinsert
async function syncLessonSessions(
  lessonId: number,
  sessions: LessonSessionInput[],
  write: AtomicWrite,
) {
  const existing = await db
    .select({ index: lessonSessions.index, startsAt: lessonSessions.startsAt })
    .from(lessonSessions)
    .where(eq(lessonSessions.lessonId, lessonId))
  const existingIds = new Set(existing.map((r) => r.index))

  const keptIds = new Set(
    sessions.map((s) => s.index).filter((id): id is number => id !== null && existingIds.has(id)),
  )

  const removedIds = [...existingIds].filter((id) => !keptIds.has(id))
  if (removedIds.length > 0) {
    write.add(db.delete(lessonSessions).where(inIdList(lessonSessions.index, removedIds)))
  }

  for (const session of sessions) {
    const values = { lessonId, ...fromSessionInput(session) }
    if (session.index !== null && keptIds.has(session.index)) {
      write.add(
        db.update(lessonSessions).set(values).where(eq(lessonSessions.index, session.index)),
      )
    } else {
      write.add(db.insert(lessonSessions).values(values))
    }
  }

  const movedBeforeBoundary = sessions
    .filter(
      (session) =>
        session.index != null &&
        session.date < CALENDAR_SYNC_START_DATE &&
        existing.some(
          (old) =>
            old.index === session.index && old.startsAt.slice(0, 10) >= CALENDAR_SYNC_START_DATE,
        ),
    )
    .map((session) => session.index!)
  return { removedIds: [...removedIds, ...movedBeforeBoundary] }
}

async function reconcileCalendar(lessonId: number, removedSessionIds: number[] = []) {
  if (!gcalEnabled()) return
  try {
    for (const id of removedSessionIds) await deleteSessionEvent(id)
    await syncLessonCalendar(lessonId)
  } catch (err) {
    console.error('Calendar sync failed for lesson', lessonId, err)
  }
}

export const getCalendarSyncLessons = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePrivilege('db')
  return { enabled: gcalEnabled(), ids: await calendarLessonIds() }
})

export const resyncLessonCalendar = createServerFn({ method: 'POST' })
  .validator((input: { lessonId: number }) => input)
  .handler(async ({ data }) => {
    await requirePrivilege('db')
    if (!gcalEnabled()) throw new Error('Calendar sync is not configured')
    try {
      await syncLessonCalendar(data.lessonId)
      return { success: true }
    } catch (error) {
      console.error('Calendar sync failed for lesson', data.lessonId, error)
      throw new Error('Calendar sync failed. Try again.')
    }
  })

export const createLesson = createServerFn({ method: 'POST' })
  .validator((data: LessonInsert) => lessonInsertSchema.parse(data))
  .handler(async ({ data }) => {
    await requirePrivilege('db')
    const { error } = resolveLessonQuarter(
      lastSessionDate(data.sessions),
      await fetchQuarterDates(),
    )
    if (error) throw new Error(error)
    const row = fromLessonInsert(data)
    let id: number
    try {
      id = await atomicWrite(async (tx) => {
        const lessonId = await tx.nextId(lessons)
        tx.add(db.insert(lessons).values({ ...row, index: lessonId }))
        await syncLessonSessions(lessonId, data.sessions, tx)
        return lessonId
      })
    } catch (error) {
      console.error('Create lesson failed:', error)
      throw new Error('Could not save the lesson. Please try again.')
    }
    await reconcileCalendar(id)
    return { success: true, id }
  })

export const updateLesson = createServerFn({ method: 'POST' })
  .validator(
    lessonInsertSchema.extend({
      index: z.number().int(),
      sendCapacityEmails: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { index, sendCapacityEmails, ...rest } = data
    await requireLessonManagement(index)
    const { error } = resolveLessonQuarter(
      lastSessionDate(rest.sessions),
      await fetchQuarterDates(),
    )
    if (error) throw new Error(error)
    const row = fromLessonInsert(rest)

    try {
      const result = await atomicWrite(async (tx) => {
        const [current] = await db
          .select({ size: lessons.size })
          .from(lessons)
          .where(eq(lessons.index, index))
        if (!current) throw new Error('Lesson not found')
        const currentSize = current.size ?? 0
        const students =
          currentSize !== row.size && sendCapacityEmails !== false
            ? await fetchLessonStudents(index)
            : []
        const { changes, preview } = getLessonCapacityChange(students, currentSize, row.size)
        if (changes.length > 0 && sendCapacityEmails === undefined) {
          return { preview }
        }

        tx.add(db.update(lessons).set(row).where(eq(lessons.index, index)))
        const { removedIds } = await syncLessonSessions(index, rest.sessions, tx)
        if (!sendCapacityEmails || changes.length === 0) return { removedIds }

        const [announcement] = await db
          .select({ id: lessonAnnouncements.id })
          .from(lessonAnnouncements)
          .where(eq(lessonAnnouncements.lessonId, index))
          .limit(1)
        return {
          removedIds,
          notification: {
            changes,
            announcementsUrl: announcement ? lessonPageUrl(index) : undefined,
          },
        }
      })
      if (result.preview) return { status: 'confirm' as const, preview: result.preview }

      let emails
      if (result.notification) {
        const [lessonRow] = await baseLessonQuery().where(eq(lessons.index, index))
        const lesson = toRichLesson(lessonRow, await fetchLessonSessions(index))
        const info = await fetchLessonEmailInfo(lesson)
        emails = await sendLessonCapacityEmails(
          index,
          info,
          result.notification.changes,
          result.notification.announcementsUrl,
        )
      }
      await reconcileCalendar(index, result.removedIds)
      return { status: 'saved' as const, emails }
    } catch (error) {
      console.error('Failed to update lesson', index, error)
      throw new Error('Failed to update lesson')
    }
  })

export const deleteLesson = createServerFn({ method: 'POST' })
  .validator((input: { index: number }) => input)
  .handler(async ({ data: { index } }) => {
    await requireLessonManagement(index)
    const removed = await db
      .select({ index: lessonSessions.index })
      .from(lessonSessions)
      .where(eq(lessonSessions.lessonId, index))
    await db.delete(lessonAnnouncements).where(eq(lessonAnnouncements.lessonId, index))
    await db.delete(signups).where(eq(signups.class, index))
    await db.delete(lessonSessions).where(eq(lessonSessions.lessonId, index))
    await db.delete(lessons).where(eq(lessons.index, index))
    await reconcileCalendar(
      index,
      removed.map((r) => r.index),
    )
    return { success: true }
  })

export const removeStudentFromLesson = createServerFn({ method: 'POST' })
  .validator((input: { lessonId: number; studentWycNumber: number }) => ({
    lessonId: input.lessonId,
    studentWycNumber: input.studentWycNumber,
  }))
  .handler(async ({ data: { lessonId, studentWycNumber } }) => {
    // Self-removal
    const userId = await requireAuth()
    if (studentWycNumber !== userId) {
      await requireLessonManagement(lessonId)
    }

    // Get lesson + enrollment lists to detect waitlist promotion
    const lessonData = await fetchLessonDetails(lessonId)
    if (!lessonData) throw new Error('Lesson not found')
    const { lesson, enrolledStudents, waitlistedStudents } = lessonData

    // Student is promoted if: removed student is enrolled AND there's a waitlisted student
    const isEnrolled = enrolledStudents.some((s) => s.wycNumber === studentWycNumber)
    const promotedStudent =
      isEnrolled && waitlistedStudents.length > 0 ? waitlistedStudents[0] : null

    // Delete the signup
    await db
      .delete(signups)
      .where(and(eq(signups.class, lessonId), eq(signups.student, studentWycNumber)))

    // Send promotion email (fire-and-forget)
    if (promotedStudent) {
      try {
        const studentName = `${promotedStudent.first} ${promotedStudent.last}`.trim() || 'Member'
        const lessonEmailInfo = await fetchLessonEmailInfo(lesson)
        const [announcement] = await db
          .select({ id: lessonAnnouncements.id })
          .from(lessonAnnouncements)
          .where(eq(lessonAnnouncements.lessonId, lessonId))
          .limit(1)

        await sendEmail({
          to: promotedStudent.email,
          subject: lessonWaitlistPromotionSubject,
          ...lessonEnrolledEmail(
            studentName,
            lessonEmailInfo,
            true,
            announcement ? lessonPageUrl(lessonId) : undefined,
          ),
          idempotencyKey: `promote/${lessonId}/${promotedStudent.wycNumber}/${Date.now()}`,
        })
      } catch (emailError) {
        console.error('Failed to send promotion email:', emailError)
      }
    }

    return { success: true }
  })

export const unenrollFromLesson = createServerFn({ method: 'POST' })
  .validator((input: { lessonId: number }) => ({ lessonId: input.lessonId }))
  .handler(async ({ data: { lessonId } }) => {
    const userId = await requireAuth()

    const [signup] = await db
      .select({ index: signups.index })
      .from(signups)
      .where(and(eq(signups.class, lessonId), eq(signups.student, userId)))
      .limit(1)

    if (!signup) throw new Error('You are not signed up for this lesson')

    return removeStudentFromLesson({ data: { lessonId, studentWycNumber: userId } })
  })

export const getMyLessonsTaught = createServerFn({ method: 'GET' }).handler(async () => {
  const userId = await requireAuth()

  const raw = await baseLessonQuery()
    .where(or(eq(lessons.instructor1, userId), eq(lessons.instructor2, userId)))
    .orderBy(asc(lessons.calendarDate))

  const sessionsByLesson = await fetchSessionsByLesson(raw.map((r) => r.index))
  return raw
    .map((row) => toRichLesson(row, sessionsByLesson.get(row.index) ?? []))
    .sort(byDateThenStart)
})

export const getMySignedUpLessons = createServerFn({ method: 'GET' }).handler(async () => {
  const userId = await requireAuth()
  const currentQuarter = await getCurrentQuarter()

  const mySignups = await baseSignedUpWithDetailsQuery(userId, currentQuarter)

  if (mySignups.length === 0) return [] as SignedUpLesson[]

  // Batch-get all signup indices for these lessons to compute enrollment positions
  const lessonIds = [...new Set(mySignups.map((s) => s.index))]
  const allSignups = await db
    .select({ class: signups.class, index: signups.index })
    .from(signups)
    .where(inIdList(signups.class, lessonIds))
    .orderBy(asc(signups.class), asc(signups.index))

  // Group signup indices by lesson
  const signupsByLesson = new Map<number, number[]>()
  for (const s of allSignups) {
    const arr = signupsByLesson.get(s.class) ?? []
    arr.push(s.index)
    signupsByLesson.set(s.class, arr)
  }

  const sessionsByLesson = await fetchSessionsByLesson(lessonIds)

  // Map to SignedUpLesson with enrollment status
  return mySignups
    .map((row): SignedUpLesson => {
      const lesson = toRichLesson(row, sessionsByLesson.get(row.index) ?? [])
      const indices = signupsByLesson.get(row.index) ?? []
      const position = indices.indexOf(row.signupIndex)
      return {
        ...lesson,
        status: enrollmentStatus(position, lesson.size),
        instructor1Email: row.instructor1Email ?? '',
        instructor2Email: row.instructor2Email ?? '',
      }
    })
    .sort(byDateThenStart)
})

export const getLessonForSignup = createServerFn({ method: 'GET' })
  .validator((input: { id: number }) => ({ id: input.id }))
  .handler(async ({ data: { id } }) => {
    const userId = await requireAuth()

    const [lessonRow] = await baseLessonQuery().where(eq(lessons.index, id))
    if (!lessonRow) return null

    const lesson = toRichLesson(lessonRow, await fetchLessonSessions(id))

    // Membership must cover the lesson's own quarter, not just the current one
    const [member] = await db
      .select({ expireQtrIndex: wycDatabase.expireQtrIndex })
      .from(wycDatabase)
      .where(eq(wycDatabase.wycNumber, userId))
      .limit(1)
    const isMembershipSufficient =
      member && lesson.expire > 0 ? isMembershipActive(member.expireQtrIndex, lesson.expire) : false

    const [requiredQuarter] = await db
      .select({ school: quarters.school })
      .from(quarters)
      .where(eq(quarters.index, lesson.expire))
      .limit(1)
    const requiredQuarterName = requiredQuarter?.school ?? `Quarter ${lesson.expire}`

    // Get all signups to compute enrollment counts
    const lessonSignups = await db
      .select({ index: signups.index, student: signups.student })
      .from(signups)
      .where(eq(signups.class, id))
      .orderBy(asc(signups.index))

    const { enrolled, waitlisted } = splitEnrollment(lessonSignups, lesson.size)

    return {
      lesson,
      enrolledCount: enrolled.length,
      waitlistedCount: waitlisted.length,
      signupsOpen: lesson.expire > 0 && lessonSignupsOpen(lesson.sessions, lesson.size),
      isAlreadySignedUp: lessonSignups.some((s) => s.student === userId),
      isMembershipSufficient,
      requiredQuarterName,
    }
  })

export const enrollInLesson = createServerFn({ method: 'POST' })
  .validator((input: { lessonIndex: number }) => ({ lessonIndex: input.lessonIndex }))
  .handler(async ({ data: { lessonIndex } }) => {
    const userId = await requireAuth()

    try {
      // Fetch lesson (rich query for email template)
      const [lessonRow] = await baseLessonQuery().where(eq(lessons.index, lessonIndex))
      if (!lessonRow) throw new Error('Lesson not found')
      const lesson = toRichLesson(lessonRow, await fetchLessonSessions(lessonIndex))
      if (!lesson.expire || !lessonSignupsOpen(lesson.sessions, lesson.size)) {
        throw new Error('Signups are closed for this lesson')
      }

      // Membership must cover the lesson's own quarter, not just the current one
      const [member] = await db
        .select({
          expireQtrIndex: wycDatabase.expireQtrIndex,
          first: wycDatabase.first,
          last: wycDatabase.last,
          email: wycDatabase.email,
        })
        .from(wycDatabase)
        .where(eq(wycDatabase.wycNumber, userId))
        .limit(1)

      if (!member) throw new Error('Member not found')
      if (!isMembershipActive(member.expireQtrIndex, lesson.expire)) {
        const [requiredQuarter] = await db
          .select({ school: quarters.school })
          .from(quarters)
          .where(eq(quarters.index, lesson.expire))
          .limit(1)
        const requiredQuarterName = requiredQuarter?.school ?? `Quarter ${lesson.expire}`
        throw new Error(`Renew your membership to ${requiredQuarterName} to sign up.`)
      }

      // Duplicate check
      const [existing] = await db
        .select({ index: signups.index })
        .from(signups)
        .where(and(eq(signups.class, lessonIndex), eq(signups.student, userId)))
        .limit(1)

      if (existing) throw new Error('You are already signed up for this lesson.')

      if (!lessonSignupsOpen(await fetchLessonSessions(lessonIndex), lesson.size)) {
        throw new Error('Signups are closed for this lesson')
      }

      // Insert signup
      if (!(await insertEligibleSignup(lessonIndex, userId))) {
        throw new Error('Lesson eligibility changed. Refresh and try again.')
      }

      // Compute enrollment status
      const allSignups = await db
        .select({ index: signups.index, student: signups.student })
        .from(signups)
        .where(eq(signups.class, lessonIndex))
        .orderBy(asc(signups.index))

      const position = allSignups.findIndex((s) => s.student === userId)
      const status = enrollmentStatus(position, lesson.size)

      // Send confirmation email (fire-and-forget — don't fail signup on email error)
      try {
        const studentName = `${member.first ?? ''} ${member.last ?? ''}`.trim() || 'Member'
        const lessonEmailInfo = await fetchLessonEmailInfo(lesson)

        const emailContent =
          status === 'enrolled'
            ? lessonEnrolledEmail(studentName, lessonEmailInfo)
            : lessonWaitlistedEmail(studentName, lessonEmailInfo)
        const emailSubject =
          status === 'enrolled'
            ? 'WYC lesson enrollment confirmation'
            : 'WYC lesson waitlist notification'

        await sendEmail({
          to: member.email ?? '',
          subject: emailSubject,
          ...emailContent,
          idempotencyKey: `enroll/${lessonIndex}/${userId}`,
        })
      } catch (emailError) {
        console.error('Failed to send enrollment email:', emailError)
      }

      return { success: true as const, status }
    } catch (error: any) {
      // Re-throw known user-facing errors
      if (
        error.message === 'Signups are closed for this lesson' ||
        error.message === 'Lesson eligibility changed. Refresh and try again.' ||
        error.message === 'Lesson not found' ||
        error.message === 'Member not found' ||
        error.message === 'You are already signed up for this lesson.' ||
        error.message?.startsWith('Renew your membership to')
      ) {
        throw error
      }
      console.error('Failed to enroll in lesson:', error)
      throw new Error('Failed to sign up for lesson')
    }
  })
