import { eq } from 'drizzle-orm'
import { alias, type MySqlColumn } from 'drizzle-orm/mysql-core'
import db from './index'
import { classType, lessons, wycDatabase } from './schema'

const instructor1Table = alias(wycDatabase, 'i1')
const instructor2Table = alias(wycDatabase, 'i2')

export const lessonSortColumns: Record<string, MySqlColumn> = {
  calendarDate: lessons.calendarDate,
  index: lessons.index,
}

export const lessonTableSelectFields = {
  index: lessons.index,
  typeId: lessons.type,
  type: classType.text,
  subtype: lessons.subtype,
  day: lessons.day,
  time: lessons.time,
  dates: lessons.dates,
  calendarDate: lessons.calendarDate,
  instructor1: lessons.instructor1,
  instructor2: lessons.instructor2,
  instructor1First: instructor1Table.first,
  instructor1Last: instructor1Table.last,
  instructor2First: instructor2Table.first,
  instructor2Last: instructor2Table.last,
  comments: lessons.comments,
  size: lessons.size,
  expire: lessons.expire,
  display: lessons.display,
}

export type LessonQueryRow = Awaited<ReturnType<typeof baseLessonQuery>>[number]

export function baseLessonQuery() {
  return db
    .select(lessonTableSelectFields)
    .from(lessons)
    .leftJoin(classType, eq(classType.index, lessons.type))
    .leftJoin(instructor1Table, eq(lessons.instructor1, instructor1Table.wycNumber))
    .leftJoin(instructor2Table, eq(lessons.instructor2, instructor2Table.wycNumber))
}
