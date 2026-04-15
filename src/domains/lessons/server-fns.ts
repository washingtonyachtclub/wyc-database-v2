import db from '@/db/index'
import type { LessonFilters } from '@/domains/lessons/filter-types'
import {
  baseLessonQuery,
  baseSignedUpWithDetailsQuery,
  lessonSortColumns,
  withLessonFilters,
} from '@/domains/lessons/queries'
import type { LessonInsert, LessonStudent, SignedUpLesson } from '@/domains/lessons/schema'
import { fromLessonInsert, toRichLesson } from '@/domains/lessons/schema'
import {
  requireAuth,
  requireInstructorOrPrivilege,
  requirePrivilege,
} from '@/lib/auth/auth-middleware'
import { sendEmail } from '@/lib/email'
import type { LessonEmailInfo } from '@/lib/email-templates'
import { lessonEnrolledEmail, lessonWaitlistedEmail } from '@/lib/email-templates'
import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, eq, gte, inArray, or } from 'drizzle-orm'
import { isMembershipActive } from 'src/db/membership-utils'
import { withPagination, withSorting } from 'src/db/query-helpers'
import { lessonQuarter, lessons, signups, wycDatabase } from 'src/db/schema'
import { enrollmentStatus, splitEnrollment } from 'src/db/signup-utils'

export const getPublicLessons = createServerFn({ method: 'GET' }).handler(async () => {
  // No auth required — this is the public lesson list for the WordPress iframe
  const quarterRow = await db
    .select({ quarter: lessonQuarter.quarter })
    .from(lessonQuarter)
    .where(eq(lessonQuarter.index, 1))
    .limit(1)
  const currentQuarter = quarterRow[0].quarter

  const raw = await baseLessonQuery()
    .where(and(eq(lessons.expire, currentQuarter), eq(lessons.display, 1)))
    .orderBy(asc(lessons.calendarDate), asc(lessons.time))

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

  return raw.map((row) => ({
    lesson: toRichLesson(row),
    enrolledCount: enrollmentCounts.get(row.index) ?? 0,
  }))
})

export const getQuarterLessons = createServerFn({ method: 'GET' }).handler(async () => {
  const userId = await requirePrivilege('db')
  const currentQuarter = await getCurrentQuarter()

  const query = baseLessonQuery()
    .where(gte(lessons.expire, currentQuarter))
    .orderBy(asc(lessons.calendarDate), asc(lessons.time))

  const raw = await query
  const data = raw.map(toRichLesson)

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
    await requirePrivilege('db')

    const query = baseLessonQuery().$dynamic()

    withLessonFilters(query, filters)
    withSorting(query, sorting, lessonSortColumns, lessons.index)
    withPagination(query, pageIndex, pageSize)

    const raw = await query
    const data = raw.map(toRichLesson)

    const countQuery = db.select({ count: count() }).from(lessons).$dynamic()
    withLessonFilters(countQuery, filters)
    const [totalCountResult] = await countQuery

    return { data, totalCount: totalCountResult.count }
  })

// Internal helper — no auth check. Used by getLessonById and removeStudentFromLesson.
async function fetchLessonDetails(id: number) {
  const [lessonRow] = await baseLessonQuery().where(eq(lessons.index, id))
  if (!lessonRow) return null

  const lesson = toRichLesson(lessonRow)
  const students = await db
    .select({
      wycNumber: wycDatabase.wycNumber,
      first: wycDatabase.first,
      last: wycDatabase.last,
      email: wycDatabase.email,
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
    await requireInstructorOrPrivilege(id, 'db')
    return fetchLessonDetails(id)
  })

export const createLesson = createServerFn({ method: 'POST' })
  .inputValidator((data: LessonInsert) => data)
  .handler(async ({ data }) => {
    await requirePrivilege('db')
    const row = fromLessonInsert(data)
    const id = await db.insert(lessons).values(row).$returningId()
    return { success: true, id }
  })

export const updateLesson = createServerFn({ method: 'POST' })
  .inputValidator((input: { index: number } & LessonInsert) => ({
    ...input,
    index: Number(input.index),
  }))
  .handler(async ({ data }) => {
    const { index, ...rest } = data
    await requireInstructorOrPrivilege(index, 'db')
    const row = fromLessonInsert(rest)
    await db.update(lessons).set(row).where(eq(lessons.index, index))
    return { success: true, index }
  })

export const deleteLesson = createServerFn({ method: 'POST' })
  .inputValidator((input: { index: number }) => input)
  .handler(async ({ data: { index } }) => {
    await requirePrivilege('db')
    await db.delete(signups).where(eq(signups.class, index))
    await db.delete(lessons).where(eq(lessons.index, index))
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
      await requireInstructorOrPrivilege(lessonId, 'db')
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
        const instructorIds = [lesson.instructor1, lesson.instructor2].filter(
          (id): id is number => id != null && id !== 0,
        )
        const instructorEmails =
          instructorIds.length > 0
            ? await db
                .select({ wycNumber: wycDatabase.wycNumber, email: wycDatabase.email })
                .from(wycDatabase)
                .where(inArray(wycDatabase.wycNumber, instructorIds))
            : []
        const instructorEmailMap = new Map(
          instructorEmails.map((i) => [i.wycNumber, i.email ?? '']),
        )

        const studentName = `${promotedStudent.first} ${promotedStudent.last}`.trim() || 'Member'
        const lessonEmailInfo: LessonEmailInfo = {
          type: lesson.type,
          subtype: lesson.subtype,
          day: lesson.day,
          time: lesson.time,
          dates: lesson.dates,
          instructor1Name: lesson.instructor1Name,
          instructor1Email: instructorEmailMap.get(lesson.instructor1) ?? '',
          instructor2Name: lesson.instructor2Name,
          instructor2Email: lesson.instructor2
            ? (instructorEmailMap.get(lesson.instructor2) ?? '')
            : '',
        }

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
    .orderBy(asc(lessons.calendarDate), asc(lessons.time))

  return raw.map(toRichLesson)
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

  // Map to SignedUpLesson with enrollment status
  return mySignups.map((row): SignedUpLesson => {
    const lesson = toRichLesson(row)
    const indices = signupsByLesson.get(row.index) ?? []
    const position = indices.indexOf(row.signupIndex)
    return {
      ...lesson,
      status: enrollmentStatus(position, lesson.size),
      instructor1Email: row.instructor1Email ?? '',
      instructor2Email: row.instructor2Email ?? '',
    }
  })
})

export const getLessonForSignup = createServerFn({ method: 'GET' })
  .inputValidator((input: { id: number }) => ({ id: input.id }))
  .handler(async ({ data: { id } }) => {
    const userId = await requireAuth()

    const [lessonRow] = await baseLessonQuery().where(eq(lessons.index, id))
    if (!lessonRow) return null

    const lesson = toRichLesson(lessonRow)

    // Block signup for non-displayed lessons
    if (!lesson.display) return null

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
      const lesson = toRichLesson(lessonRow)

      // Membership expiration check
      const currentQuarter = await getCurrentQuarter()
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
      if (!isMembershipActive(member.expireQtrIndex, currentQuarter)) {
        throw new Error(
          'Your membership has expired. Please renew your membership before signing up for lessons.',
        )
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
        const instructorIds = [lesson.instructor1, lesson.instructor2].filter(
          (id): id is number => id != null && id !== 0,
        )
        const instructorEmails =
          instructorIds.length > 0
            ? await db
                .select({ wycNumber: wycDatabase.wycNumber, email: wycDatabase.email })
                .from(wycDatabase)
                .where(inArray(wycDatabase.wycNumber, instructorIds))
            : []
        const instructorEmailMap = new Map(
          instructorEmails.map((i) => [i.wycNumber, i.email ?? '']),
        )

        const studentName = `${member.first ?? ''} ${member.last ?? ''}`.trim() || 'Member'
        const lessonEmailInfo: LessonEmailInfo = {
          type: lesson.type,
          subtype: lesson.subtype,
          day: lesson.day,
          time: lesson.time,
          dates: lesson.dates,
          instructor1Name: lesson.instructor1Name,
          instructor1Email: instructorEmailMap.get(lesson.instructor1) ?? '',
          instructor2Name: lesson.instructor2Name,
          instructor2Email: lesson.instructor2
            ? (instructorEmailMap.get(lesson.instructor2) ?? '')
            : '',
        }

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
        error.message?.startsWith('Your membership has expired')
      ) {
        throw error
      }
      console.error('Failed to enroll in lesson:', error)
      throw new Error('Failed to sign up for lesson')
    }
  })
