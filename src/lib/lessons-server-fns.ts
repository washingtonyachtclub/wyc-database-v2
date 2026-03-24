import { createServerFn } from '@tanstack/react-start'
import { asc, count, eq, gte } from 'drizzle-orm'
import { baseLessonQuery, lessonSortColumns } from 'src/db/lesson-queries'
import { fromLessonInsert, toRichLesson } from 'src/db/mappers'
import { withPagination, withSorting } from 'src/db/query-helpers'
import { classType, lessonQuarter, lessons } from 'src/db/schema'
import type { LessonInsert } from 'src/db/types'
import db from '../db/index'
import { requireAuth } from '../lib/auth-middleware'

export const getQuarterLessons = createServerFn({ method: 'GET' }).handler(async () => {
  const userId = await requireAuth()
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
    await requireAuth()

    const query = baseLessonQuery().$dynamic()

    withSorting(query, sorting, lessonSortColumns, lessons.index)
    withPagination(query, pageIndex, pageSize)

    const raw = await query
    const data = raw.map(toRichLesson)

    const [totalCountResult] = await db.select({ count: count() }).from(lessons)

    return { data, totalCount: totalCountResult.count }
  })

export const getClassTypes = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAuth()
  const rows = await db.select().from(classType).orderBy(asc(classType.text))
  return rows
})

export const createLesson = createServerFn({ method: 'POST' })
  .inputValidator((data: LessonInsert) => data)
  .handler(async ({ data }) => {
    await requireAuth()
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
    await requireAuth()
    const { index, ...rest } = data
    const row = fromLessonInsert(rest)
    await db.update(lessons).set(row).where(eq(lessons.index, index))
    return { success: true, index }
  })
