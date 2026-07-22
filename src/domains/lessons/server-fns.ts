import { WORK_PARTY_TYPE_ID } from '@/db/constants'
import db from '@/db/index'
import { isMembershipActive } from '@/db/membership-utils'
import { withPagination, withSorting } from '@/db/query-helpers'
import { lessonQuarter, lessonSessions, lessons, quarters, signups, wycDatabase } from '@/db/schema'
import { enrollmentStatus, splitEnrollment } from '@/db/signup-utils'
import type { LessonFilters } from '@/domains/lessons/filter-types'
import { quarterMismatchError } from '@/domains/lessons/quarter-rules'
import {
  baseLessonQuery,
  baseSignedUpWithDetailsQuery,
  fetchLessonEmailInfo,
  fetchLessonSessions,
  fetchSessionsByLesson,
  lessonSortColumns,
  withLessonFilters,
} from '@/domains/lessons/queries'
import type {
  LessonInsert,
  LessonSessionInput,
  LessonStudent,
  SignedUpLesson,
} from '@/domains/lessons/schema'
import {
  byDateThenStart,
  fromLessonInsert,
  fromSessionInput,
  lastSessionDate,
  toRichLesson,
} from '@/domains/lessons/schema'
import {
  requireAuth,
  requireInstructorOrPrivilege,
  requirePrivilege,
} from '@/lib/auth/auth-middleware'
import { sendEmail } from '@/lib/email'
import { lessonEnrolledEmail, lessonWaitlistedEmail } from '@/lib/email-templates'
import { deleteSessionEvent, gcalEnabled, upsertSessionEvent } from '@/lib/gcal'
import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, eq, gte, inArray, or } from 'drizzle-orm'

export const getPublicLessons = createServerFn({ method: 'GET' }).handler(async () => {
  // No auth required — this is the public lesson list for the WordPress iframe
  const quarterRow = await db
    .select({ quarter: lessonQuarter.quarter })
    .from(lessonQuarter)
    .where(eq(lessonQuarter.index, 1))
    .limit(1)
  const currentQuarter = quarterRow[0].quarter

  const raw = await baseLessonQuery()
    .where(and(gte(lessons.expire, currentQuarter), eq(lessons.display, 1)))
    .orderBy(asc(lessons.calendarDate))

  const lessonIds = raw.map((r) => r.index)

  // Batch enrollment counts
  let enrollmentCounts = new Map<number, number>()
  if (lessonIds.length > 0) {
    const counts = await db
      .select({ class: signups.class, count: count() })
      .from(signups)
      .where(inArray(signups.class, lessonIds))
      .groupBy(signups.class)
    enrollmentCounts = new Map(counts.map((c) => [c.class, c.count]))
  }

  const sessionsByLesson = await fetchSessionsByLesson(lessonIds)

  return raw
    .map((row) => ({
      lesson: toRichLesson(row, sessionsByLesson.get(row.index) ?? []),
      enrolledCount: enrollmentCounts.get(row.index) ?? 0,
    }))
    .sort((a, b) => byDateThenStart(a.lesson, b.lesson))
})

export const getQuarterLessons = createServerFn({ method: 'GET' }).handler(async () => {
  const userId = await requirePrivilege('db', 'rtgs')
  const currentQuarter = await getCurrentQuarter()

  const raw = await baseLessonQuery()
    .where(gte(lessons.expire, currentQuarter))
    .orderBy(asc(lessons.calendarDate))

  const lessonIds = raw.map((r) => r.index)
  let enrollmentCounts = new Map<number, number>()
  if (lessonIds.length > 0) {
    const counts = await db
      .select({ class: signups.class, count: count() })
      .from(signups)
      .where(inArray(signups.class, lessonIds))
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
  .inputValidator(
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
    await requirePrivilege('db', 'rtgs')

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
  const students = await db
    .select({
      wycNumber: wycDatabase.wycNumber,
      first: wycDatabase.first,
      last: wycDatabase.last,
      email: wycDatabase.email,
      phone1: wycDatabase.phone1,
    })
    .from(signups)
    .innerJoin(wycDatabase, eq(signups.student, wycDatabase.wycNumber))
    .where(eq(signups.class, id))
    .orderBy(asc(signups.index))

  const lessonStudents: LessonStudent[] = students.map((s) => ({
    wycNumber: s.wycNumber,
    first: s.first || '<Unknown>',
    last: s.last || '<Unknown>',
    email: s.email || '<Unknown>',
    phone1: s.phone1 || '',
  }))

  const { enrolled: enrolledStudents, waitlisted: waitlistedStudents } = splitEnrollment(
    lessonStudents,
    lesson.size,
  )

  return { lesson, enrolledStudents, waitlistedStudents }
}

export const getLessonById = createServerFn({ method: 'GET' })
  .inputValidator((input: { id: number }) => ({ id: input.id }))
  .handler(async ({ data: { id } }) => {
    await requireInstructorOrPrivilege(id, 'db', 'rtgs')
    return fetchLessonDetails(id)
  })

// Deltas rather than wipe-and-reinsert
async function syncLessonSessions(lessonId: number, sessions: LessonSessionInput[]) {
  const existing = await db
    .select({ index: lessonSessions.index })
    .from(lessonSessions)
    .where(eq(lessonSessions.lessonId, lessonId))
  const existingIds = new Set(existing.map((r) => r.index))

  const keptIds = new Set(
    sessions.map((s) => s.index).filter((id): id is number => id !== null && existingIds.has(id)),
  )

  const removedIds = [...existingIds].filter((id) => !keptIds.has(id))
  if (removedIds.length > 0) {
    await db.delete(lessonSessions).where(inArray(lessonSessions.index, removedIds))
  }

  for (const session of sessions) {
    const values = { lessonId, ...fromSessionInput(session) }
    if (session.index !== null && keptIds.has(session.index)) {
      await db.update(lessonSessions).set(values).where(eq(lessonSessions.index, session.index))
    } else {
      await db.insert(lessonSessions).values(values)
    }
  }

  return { removedIds }
}

async function fetchCurrentQuarter(): Promise<number> {
  const [row] = await db
    .select({ quarter: lessonQuarter.quarter })
    .from(lessonQuarter)
    .where(eq(lessonQuarter.index, 1))
    .limit(1)
  return row.quarter
}

// Best-effort: a calendar failure must never break a lesson mutation. resyncLessonCalendar repairs.
async function reconcileCalendar(lessonId: number, removedSessionIds: number[] = []) {
  if (!gcalEnabled()) return
  try {
    for (const id of removedSessionIds) await deleteSessionEvent(id)

    const [lessonRow] = await baseLessonQuery().where(eq(lessons.index, lessonId))
    if (!lessonRow) return
    const lesson = toRichLesson(lessonRow, await fetchLessonSessions(lessonId))

    const inScope = lesson.display && lesson.expire >= (await fetchCurrentQuarter())
    const cal = {
      title: lesson.subtype || lesson.type || 'WYC Lesson',
      location: lesson.location,
      comments: lesson.comments,
      requirements: lesson.requirements,
      instructors: [lesson.instructor1Name, lesson.instructor2Name].filter(
        (name) => name !== '' && name !== '<Unknown>',
      ),
      colorId: lesson.classTypeId === WORK_PARTY_TYPE_ID ? '4' : undefined, // 4 = Flamingo
    }
    for (const session of lesson.sessions) {
      if (inScope) await upsertSessionEvent(cal, session)
      else await deleteSessionEvent(session.index)
    }
  } catch (err) {
    console.error('Calendar sync failed for lesson', lessonId, err)
  }
}

export const resyncLessonCalendar = createServerFn({ method: 'POST' })
  .inputValidator((input: { lessonId?: number }) => input)
  .handler(async ({ data }) => {
    await requirePrivilege('db', 'rtgs')
    if (!gcalEnabled()) return { success: false, synced: 0 }
    // Backfill only pushes in-scope lessons. Deleting an out-of-scope lesson's events
    // is the per-mutation path's job (hide/delete); blind-deleting every past lesson's
    // never-created events here is thousands of wasted calls that blow the quota.
    const ids =
      data.lessonId != null
        ? [data.lessonId]
        : (
            await db
              .select({ id: lessons.index })
              .from(lessons)
              .where(and(eq(lessons.display, 1), gte(lessons.expire, await fetchCurrentQuarter())))
          ).map((r) => r.id)
    for (const id of ids) await reconcileCalendar(id)
    return { success: true, synced: ids.length }
  })

export const createLesson = createServerFn({ method: 'POST' })
  .inputValidator((data: LessonInsert) => data)
  .handler(async ({ data }) => {
    await requirePrivilege('db', 'rtgs')
    const mismatch = quarterMismatchError(
      lastSessionDate(data.sessions),
      data.expire,
      await fetchQuarterDates(),
    )
    if (mismatch) throw new Error(mismatch)
    const row = fromLessonInsert(data)
    const [result] = await db.insert(lessons).values(row)
    await syncLessonSessions(result.insertId, data.sessions)
    await reconcileCalendar(result.insertId)
    return { success: true, id: result.insertId }
  })

export const updateLesson = createServerFn({ method: 'POST' })
  .inputValidator((input: { index: number } & LessonInsert) => ({
    ...input,
    index: Number(input.index),
  }))
  .handler(async ({ data }) => {
    const { index, ...rest } = data
    await requireInstructorOrPrivilege(index, 'db', 'rtgs')
    const mismatch = quarterMismatchError(
      lastSessionDate(rest.sessions),
      rest.expire,
      await fetchQuarterDates(),
    )
    if (mismatch) throw new Error(mismatch)
    const row = fromLessonInsert(rest)
    await db.update(lessons).set(row).where(eq(lessons.index, index))
    const { removedIds } = await syncLessonSessions(index, rest.sessions)
    await reconcileCalendar(index, removedIds)
    return { success: true, index }
  })

export const deleteLesson = createServerFn({ method: 'POST' })
  .inputValidator((input: { index: number }) => input)
  .handler(async ({ data: { index } }) => {
    await requirePrivilege('db', 'rtgs')
    const removed = await db
      .select({ index: lessonSessions.index })
      .from(lessonSessions)
      .where(eq(lessonSessions.lessonId, index))
    await db.delete(signups).where(eq(signups.class, index))
    await db.delete(lessonSessions).where(eq(lessonSessions.lessonId, index))
    await db.delete(lessons).where(eq(lessons.index, index))
    await reconcileCalendar(
      index,
      removed.map((r) => r.index),
    )
    return { success: true }
  })

export const setLessonDisplay = createServerFn({ method: 'POST' })
  .inputValidator((input: { index: number; display: boolean }) => input)
  .handler(async ({ data: { index, display } }) => {
    await requirePrivilege('db', 'rtgs')
    await db
      .update(lessons)
      .set({ display: display ? 1 : 0 })
      .where(eq(lessons.index, index))
    await reconcileCalendar(index)
    return { success: true }
  })

export const removeStudentFromLesson = createServerFn({ method: 'POST' })
  .inputValidator((input: { lessonId: number; studentWycNumber: number }) => ({
    lessonId: input.lessonId,
    studentWycNumber: input.studentWycNumber,
  }))
  .handler(async ({ data: { lessonId, studentWycNumber } }) => {
    // Self-removal is always allowed; otherwise require instructor or db privilege
    const userId = await requireAuth()
    if (studentWycNumber !== userId) {
      await requireInstructorOrPrivilege(lessonId, 'db', 'rtgs')
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

        await sendEmail({
          to: promotedStudent.email,
          subject: "WYC - You're off the waitlist!",
          text: lessonEnrolledEmail(studentName, lessonEmailInfo, true),
          idempotencyKey: `promote/${lessonId}/${promotedStudent.wycNumber}/${Date.now()}`,
        })
      } catch (emailError) {
        console.error('Failed to send promotion email:', emailError)
      }
    }

    return { success: true }
  })

export const unenrollFromLesson = createServerFn({ method: 'POST' })
  .inputValidator((input: { lessonId: number }) => ({ lessonId: input.lessonId }))
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
  const currentQuarter = await getCurrentQuarter()

  const raw = await baseLessonQuery()
    .where(
      and(
        or(eq(lessons.instructor1, userId), eq(lessons.instructor2, userId)),
        gte(lessons.expire, currentQuarter),
      ),
    )
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
    .where(inArray(signups.class, lessonIds))
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
  .inputValidator((input: { id: number }) => ({ id: input.id }))
  .handler(async ({ data: { id } }) => {
    const userId = await requireAuth()

    const [lessonRow] = await baseLessonQuery().where(eq(lessons.index, id))
    if (!lessonRow) return null

    const lesson = toRichLesson(lessonRow, await fetchLessonSessions(id))

    if (!lesson.display) return null

    // Membership must cover the lesson's own quarter, not just the current one
    const [member] = await db
      .select({ expireQtrIndex: wycDatabase.expireQtrIndex })
      .from(wycDatabase)
      .where(eq(wycDatabase.wycNumber, userId))
      .limit(1)
    const isMembershipSufficient = member
      ? isMembershipActive(member.expireQtrIndex, lesson.expire)
      : false

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
      isAlreadySignedUp: lessonSignups.some((s) => s.student === userId),
      isMembershipSufficient,
      requiredQuarterName,
    }
  })

export const enrollInLesson = createServerFn({ method: 'POST' })
  .inputValidator((input: { lessonIndex: number }) => ({ lessonIndex: input.lessonIndex }))
  .handler(async ({ data: { lessonIndex } }) => {
    const userId = await requireAuth()

    try {
      // Fetch lesson (rich query for email template)
      const [lessonRow] = await baseLessonQuery().where(eq(lessons.index, lessonIndex))
      if (!lessonRow) throw new Error('Lesson not found')
      const lesson = toRichLesson(lessonRow, await fetchLessonSessions(lessonIndex))

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

      // Insert signup
      await db.insert(signups).values({ class: lessonIndex, student: userId })

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

        const emailText =
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
          text: emailText,
          idempotencyKey: `enroll/${lessonIndex}/${userId}`,
        })
      } catch (emailError) {
        console.error('Failed to send enrollment email:', emailError)
      }

      return { success: true as const, status }
    } catch (error: any) {
      // Re-throw known user-facing errors
      if (
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
