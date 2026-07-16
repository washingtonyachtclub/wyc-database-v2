import { and, asc, desc, eq, gte, inArray, like, or, sql } from 'drizzle-orm'
import { alias, type MySqlColumn, type MySqlSelect } from 'drizzle-orm/mysql-core'
import db from '@/db/index'
import type { LessonFilters } from './filter-types'
import { toLessonSession, type LessonSession, type RichLesson } from './schema'
import { classType, lessonSessions, lessons, signups, wycDatabase } from '@/db/schema'
import type { LessonEmailInfo } from '@/lib/email-templates'

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

export async function fetchSessionsByLesson(
  lessonIds: number[],
): Promise<Map<number, LessonSession[]>> {
  const byLesson = new Map<number, LessonSession[]>()
  if (lessonIds.length === 0) return byLesson

  const rows = await db
    .select()
    .from(lessonSessions)
    .where(inArray(lessonSessions.lessonId, lessonIds))
    .orderBy(asc(lessonSessions.startsAt))

  for (const row of rows) {
    const arr = byLesson.get(row.lessonId) ?? []
    arr.push(toLessonSession(row))
    byLesson.set(row.lessonId, arr)
  }
  return byLesson
}

export async function fetchLessonSessions(lessonId: number): Promise<LessonSession[]> {
  return (await fetchSessionsByLesson([lessonId])).get(lessonId) ?? []
}

type InstructorRefs = { instructor1: number | null; instructor2: number | null }

function instructorIdsOf(lesson: InstructorRefs): number[] {
  return [lesson.instructor1, lesson.instructor2].filter(
    (id): id is number => id != null && id !== 0,
  )
}

export async function fetchInstructorEmails(ids: number[]): Promise<Map<number, string>> {
  if (ids.length === 0) return new Map()
  const rows = await db
    .select({ wycNumber: wycDatabase.wycNumber, email: wycDatabase.email })
    .from(wycDatabase)
    .where(inArray(wycDatabase.wycNumber, ids))
  return new Map(rows.map((r) => [r.wycNumber, r.email ?? '']))
}

export function toLessonEmailInfo(
  lesson: RichLesson,
  instructorEmails: Map<number, string>,
): LessonEmailInfo {
  return {
    type: lesson.type,
    subtype: lesson.subtype,
    sessions: lesson.sessions,
    instructor1Name: lesson.instructor1Name,
    instructor1Email: instructorEmails.get(lesson.instructor1) ?? '',
    instructor2Name: lesson.instructor2Name,
    instructor2Email: lesson.instructor2 ? (instructorEmails.get(lesson.instructor2) ?? '') : '',
  }
}

/** Batch the two steps yourself when building info for more than one lesson. */
export async function fetchLessonEmailInfo(lesson: RichLesson): Promise<LessonEmailInfo> {
  return toLessonEmailInfo(lesson, await fetchInstructorEmails(instructorIdsOf(lesson)))
}

export function allInstructorIds(lessons: InstructorRefs[]) {
  return [...new Set(lessons.flatMap(instructorIdsOf))]
}

export function withLessonFilters<T extends MySqlSelect>(
  qb: T,
  filters: LessonFilters | undefined,
) {
  const conditions = []

  if (filters?.classTypeId !== undefined) {
    conditions.push(eq(lessons.type, filters.classTypeId))
  }

  if (filters?.instructor !== undefined) {
    conditions.push(
      or(eq(lessons.instructor1, filters.instructor), eq(lessons.instructor2, filters.instructor)),
    )
  }

  if (filters?.expireQtrFilter) {
    const { quarter, mode } = filters.expireQtrFilter
    if (mode === 'atLeast') {
      conditions.push(gte(lessons.expire, quarter))
    } else {
      conditions.push(eq(lessons.expire, quarter))
    }
  }

  if (filters?.display === true) {
    conditions.push(eq(lessons.display, 1))
  }

  if (filters?.search) {
    const pattern = `%${filters.search}%`
    conditions.push(
      or(like(lessons.subtype, pattern), sql`CAST(${lessons.comments} AS CHAR) LIKE ${pattern}`),
    )
  }

  if (conditions.length > 0) {
    qb.where(and(...conditions))
  }

  return qb
}

export function baseLessonsTaughtQuery(wycNumber: number, since?: string) {
  const conditions = [or(eq(lessons.instructor1, wycNumber), eq(lessons.instructor2, wycNumber))]
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

export type SignedUpLessonQueryRow = Awaited<
  ReturnType<typeof baseSignedUpWithDetailsQuery>
>[number]

export function baseSignedUpWithDetailsQuery(wycNumber: number, minExpire: number) {
  return db
    .select(signedUpLessonSelectFields)
    .from(signups)
    .innerJoin(lessons, eq(signups.class, lessons.index))
    .leftJoin(classType, eq(classType.index, lessons.type))
    .leftJoin(instructor1Table, eq(lessons.instructor1, instructor1Table.wycNumber))
    .leftJoin(instructor2Table, eq(lessons.instructor2, instructor2Table.wycNumber))
    .where(
      and(eq(signups.student, wycNumber), gte(lessons.expire, minExpire), eq(lessons.display, 1)),
    )
    .orderBy(asc(lessons.calendarDate))
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
