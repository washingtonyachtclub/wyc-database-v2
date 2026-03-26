import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, eq, gte } from 'drizzle-orm'
import { baseLessonQuery, lessonSortColumns } from 'src/db/lesson-queries'
import type { LessonInsert } from 'src/db/lesson-schema'
import { fromLessonInsert, toRichLesson } from 'src/db/mappers'
import { withPagination, withSorting } from 'src/db/query-helpers'
import { classType, lessonQuarter, lessons, signups, wycDatabase } from 'src/db/schema'
import db from '../db/index'
import { requirePrivilege } from '../lib/auth-middleware'

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
    await requirePrivilege('db')
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

    const enrolledStudents = lessonStudents.slice(0, lesson.size)
    const waitlistedStudents = lessonStudents.slice(lesson.size)

    return { lesson, enrolledStudents, waitlistedStudents }
  })

export const getClassTypes = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePrivilege('db')
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
    await requirePrivilege('db')
    const { index, ...rest } = data
    const row = fromLessonInsert(rest)
    await db.update(lessons).set(row).where(eq(lessons.index, index))
    return { success: true, index }
  })

export const removeStudentFromLesson = createServerFn({ method: 'POST' })
  .inputValidator((input: { lessonId: number; studentWycNumber: number }) => ({
    lessonId: input.lessonId,
    studentWycNumber: input.studentWycNumber,
  }))
  .handler(async ({ data: { lessonId, studentWycNumber } }) => {
    await requirePrivilege('db')
    await db
      .delete(signups)
      .where(and(eq(signups.class, lessonId), eq(signups.student, studentWycNumber)))
    return { success: true }
  })
