import { asc, count, desc, eq, gte, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/mysql-core'
import { createServerFn } from '@tanstack/react-start'
import {
  classType,
  lessonQuarter,
  lessons,
  wycDatabase,
} from 'src/db/schema'
import db from '../db/index'
import { requireAuth } from '../lib/auth-middleware'

export type LessonRow = {
  index: number
  type: string | null
  subtype: string | null
  day: string | null
  time: string | null
  dates: string | null
  calendarDate: string
  instructor1: number | null
  instructor2: number | null
  instructor1Name: string | null
  instructor2Name: string | null
  comments: string | null
  size: number | null
  expire: number | null
  display: number
}

const instructor1Table = alias(wycDatabase, 'i1')
const instructor2Table = alias(wycDatabase, 'i2')

const lessonSelectFields = {
  index: lessons.index,
  type: classType.text,
  subtype: lessons.subtype,
  day: lessons.day,
  time: lessons.time,
  dates: lessons.dates,
  calendarDate: lessons.calendarDate,
  instructor1: lessons.instructor1,
  instructor2: lessons.instructor2,
  instructor1Name:
    sql<string>`TRIM(CONCAT(COALESCE(${instructor1Table.first}, ''), ' ', COALESCE(${instructor1Table.last}, '')))`.as(
      'instructor1Name',
    ),
  instructor2Name:
    sql<string>`TRIM(CONCAT(COALESCE(${instructor2Table.first}, ''), ' ', COALESCE(${instructor2Table.last}, '')))`.as(
      'instructor2Name',
    ),
  comments: lessons.description,
  size: lessons.size,
  expire: lessons.expire,
  display: lessons.display,
}

function baseLessonQuery() {
  return db
    .select(lessonSelectFields)
    .from(lessons)
    .leftJoin(classType, eq(classType.index, lessons.type))
    .leftJoin(instructor1Table, eq(lessons.instructor1, instructor1Table.wycNumber))
    .leftJoin(instructor2Table, eq(lessons.instructor2, instructor2Table.wycNumber))
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

    const data = await baseLessonQuery()
      .where(gte(lessons.expire, currentQuarter))
      .orderBy(asc(lessons.calendarDate), asc(lessons.time))

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

    const query = baseLessonQuery()

    const sortedQuery =
      sorting?.id === 'calendarDate'
        ? sorting.desc
          ? query.orderBy(desc(lessons.calendarDate))
          : query.orderBy(asc(lessons.calendarDate))
        : query.orderBy(desc(lessons.index))

    const data = await sortedQuery.limit(pageSize).offset(pageIndex * pageSize)

    const [totalCountResult] = await db
      .select({ count: count() })
      .from(lessons)

    return { data, totalCount: totalCountResult.count }
  })
