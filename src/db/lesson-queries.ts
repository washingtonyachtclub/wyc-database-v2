import { and, asc, desc, eq, gte, or } from 'drizzle-orm'
import { alias, type MySqlColumn } from 'drizzle-orm/mysql-core'
import db from './index'
import { classType, lessons, signups, wycDatabase } from './schema'

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

export function baseLessonsTaughtQuery(wycNumber: number, since?: string) {
  const conditions = [
    or(eq(lessons.instructor1, wycNumber), eq(lessons.instructor2, wycNumber)),
  ]
  if (since) {
    conditions.push(gte(lessons.calendarDate, since))
  }

  return db
    .select(lessonTableSelectFields)
    .from(lessons)
    .leftJoin(classType, eq(classType.index, lessons.type))
    .leftJoin(instructor1Table, eq(lessons.instructor1, instructor1Table.wycNumber))
    .leftJoin(instructor2Table, eq(lessons.instructor2, instructor2Table.wycNumber))
    .where(and(...conditions))
    .orderBy(desc(lessons.calendarDate))
}

const signedUpLessonSelectFields = {
  ...lessonTableSelectFields,
  signupIndex: signups.index,
  instructor1Email: instructor1Table.email,
  instructor2Email: instructor2Table.email,
}

export type SignedUpLessonQueryRow =
  Awaited<ReturnType<typeof baseSignedUpWithDetailsQuery>>[number]

export function baseSignedUpWithDetailsQuery(wycNumber: number, minExpire: number) {
  return db
    .select(signedUpLessonSelectFields)
    .from(signups)
    .innerJoin(lessons, eq(signups.class, lessons.index))
    .leftJoin(classType, eq(classType.index, lessons.type))
    .leftJoin(instructor1Table, eq(lessons.instructor1, instructor1Table.wycNumber))
    .leftJoin(instructor2Table, eq(lessons.instructor2, instructor2Table.wycNumber))
    .where(and(eq(signups.student, wycNumber), gte(lessons.expire, minExpire)))
    .orderBy(asc(lessons.calendarDate), asc(lessons.time))
}

export function baseLessonsSignedUpQuery(wycNumber: number, since?: string) {
  const conditions = [eq(signups.student, wycNumber)]
  if (since) {
    conditions.push(gte(lessons.calendarDate, since))
  }

  return db
    .select(lessonTableSelectFields)
    .from(signups)
    .innerJoin(lessons, eq(signups.class, lessons.index))
    .leftJoin(classType, eq(classType.index, lessons.type))
    .leftJoin(instructor1Table, eq(lessons.instructor1, instructor1Table.wycNumber))
    .leftJoin(instructor2Table, eq(lessons.instructor2, instructor2Table.wycNumber))
    .where(and(...conditions))
    .orderBy(desc(lessons.calendarDate))
}
