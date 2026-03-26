import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, eq, gte, inArray, or } from 'drizzle-orm'
import { baseLessonQuery, baseSignedUpWithDetailsQuery, lessonSortColumns } from 'src/db/lesson-queries'
import type { LessonInsert, SignedUpLesson } from 'src/db/lesson-schema'
import { fromLessonInsert, toRichLesson } from 'src/db/mappers'
import { enrollmentStatus, splitEnrollment } from 'src/db/signup-utils'
import { withPagination, withSorting } from 'src/db/query-helpers'
import { classType, lessonQuarter, lessons, signups, wycDatabase } from 'src/db/schema'
import db from '../db/index'
import { requireAuth, requireInstructorOrPrivilege, requirePrivilege } from '../lib/auth-middleware'

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
    (input: { pageIndex: number; pageSize: number; sorting?: { id: string; desc: boolean } }) => ({
      pageIndex: input.pageIndex,
      pageSize: input.pageSize,
      sorting: input.sorting,
    }),
  )
  .handler(async ({ data: { pageIndex, pageSize, sorting } }) => {
    await requirePrivilege('db')

    const query = baseLessonQuery().$dynamic()

    withSorting(query, sorting, lessonSortColumns, lessons.index)
    withPagination(query, pageIndex, pageSize)

    const raw = await query
    const data = raw.map(toRichLesson)

    const [totalCountResult] = await db.select({ count: count() }).from(lessons)

    return { data, totalCount: totalCountResult.count }
  })

export const getLessonById = createServerFn({ method: 'GET' })
  .inputValidator((input: { id: number }) => ({ id: input.id }))
  .handler(async ({ data: { id } }) => {
    await requireInstructorOrPrivilege(id, 'db')
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

    const lessonStudents = students.map((s) => {
      return {
        wycNumber: s.wycNumber,
        first: s.first || '<Unknown>',
        last: s.last || '<Unknown>',
        email: s.email || '<Unknown>',
      }
    })

    const { enrolled: enrolledStudents, waitlisted: waitlistedStudents } =
      splitEnrollment(lessonStudents, lesson.size)

    return { lesson, enrolledStudents, waitlistedStudents }
  })

export const getClassTypes = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAuth()
  const rows = await db.select().from(classType).orderBy(asc(classType.text))
  return rows
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
    await requireInstructorOrPrivilege(lessonId, 'db')
    await db
      .delete(signups)
      .where(and(eq(signups.class, lessonId), eq(signups.student, studentWycNumber)))
    return { success: true }
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
