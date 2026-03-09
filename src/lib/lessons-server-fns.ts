import { asc, count, eq, gte } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import { classType, lessonQuarter, lessons } from 'src/db/schema'
import db from '../db/index'
import { requireAuth } from '../lib/auth-middleware'
import { toLessonTableRow } from 'src/db/mappers'
import { withSorting, withPagination } from 'src/db/query-helpers'
import { baseLessonQuery, lessonSortColumns } from 'src/db/lesson-queries'

export type LessonMutationInput = {
  type: number | null
  subtype: string | null
  day: string | null
  time: string | null
  dates: string | null
  calendarDate: string
  instructor1: number | null
  instructor2: number | null
  description: string | null
  size: number | null
  expire: number | null
  display: number
}

export const getQuarterLessons = createServerFn({ method: 'GET' }).handler(
  async () => {
    const userId = await requireAuth()

    const [quarterRow] = await db
      .select({ quarter: lessonQuarter.quarter })
      .from(lessonQuarter)
      .where(eq(lessonQuarter.index, 1))
      .limit(1)

    const currentQuarter = quarterRow?.quarter ?? 0

    const query = baseLessonQuery()
      .where(gte(lessons.expire, currentQuarter))
      .orderBy(asc(lessons.calendarDate), asc(lessons.time))

    const raw = await query
    const data = raw.map(toLessonTableRow)

    return { data, currentQuarter, userId }
  },
)

export const getAllLessons = createServerFn({ method: 'GET' })
  .inputValidator(
    (input: {
      pageIndex: number
      pageSize: number
      sorting?: { id: string; desc: boolean }
    }) => ({
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
    const data = raw.map(toLessonTableRow)

    const [totalCountResult] = await db
      .select({ count: count() })
      .from(lessons)

    return { data, totalCount: totalCountResult.count }
  })

export const getClassTypes = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireAuth()
    const rows = await db.select().from(classType).orderBy(asc(classType.text))
    return rows
  },
)

export const createLesson = createServerFn({ method: 'POST' })
  .inputValidator((data: LessonMutationInput) => data)
  .handler(async ({ data }) => {
    await requireAuth()
    try {
      const id = await db
        .insert(lessons)
        .values({
          type: data.type ?? null,
          subtype: data.subtype ?? null,
          day: data.day ?? null,
          time: data.time ?? null,
          dates: data.dates ?? null,
          calendarDate: data.calendarDate,
          instructor1: data.instructor1 ?? null,
          instructor2: data.instructor2 ?? null,
          description: data.description ?? '',
          size: data.size ?? null,
          expire: data.expire ?? null,
          display: data.display ?? 0,
        })
        .$returningId()

      return { success: true, id, data }
    } catch (error: any) {
      throw new Error(error?.message || 'Failed to create lesson')
    }
  })

export const updateLesson = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: { index: number } & LessonMutationInput) => ({
      ...input,
      index: Number(input.index),
    }),
  )
  .handler(async ({ data }) => {
    await requireAuth()
    try {
      await db
        .update(lessons)
        .set({
          type: data.type ?? null,
          subtype: data.subtype ?? null,
          day: data.day ?? null,
          time: data.time ?? null,
          dates: data.dates ?? null,
          calendarDate: data.calendarDate,
          instructor1: data.instructor1 ?? null,
          instructor2: data.instructor2 ?? null,
          description: data.description ?? '',
          size: data.size ?? null,
          expire: data.expire ?? null,
          display: data.display ?? 0,
        })
        .where(eq(lessons.index, data.index))

      return { success: true, index: data.index }
    } catch (error: any) {
      throw new Error(error?.message || 'Failed to update lesson')
    }
  })
