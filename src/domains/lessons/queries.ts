import { lessonQuarterIndex } from '@/domains/lessons/quarter-query'
import { and, asc, eq, gte, inArray, ilike, or, sql } from 'drizzle-orm'
import { alias, type PgColumn, type PgSelect } from 'drizzle-orm/pg-core'
import db from '@/db/index'
import type { LessonFilters } from './filter-types'
import { toLessonSession, type LessonSession, type LessonStudent, type RichLesson } from './schema'
import { classType, lessonSessions, lessons, signups, wycDatabase } from '@/db/schema'
import type { LessonEmailInfo } from '@/lib/emails/lessons'

const instructor1Table = alias(wycDatabase, 'i1')
const instructor2Table = alias(wycDatabase, 'i2')

export const lessonSortColumns: Record<string, PgColumn> = {
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
  description: lessons.description,
  requirements: lessons.requirements,
  size: lessons.size,
  expire: lessonQuarterIndex,
}

export type LessonQueryRow = Awaited<ReturnType<typeof baseLessonQuery>>[number]

export function baseLessonQuery(database: Pick<typeof db, 'select'> = db) {
  return database
    .select(lessonTableSelectFields)
    .from(lessons)
    .leftJoin(classType, eq(classType.index, lessons.type))
    .leftJoin(instructor1Table, eq(lessons.instructor1, instructor1Table.wycNumber))
    .leftJoin(instructor2Table, eq(lessons.instructor2, instructor2Table.wycNumber))
}

export async function fetchSessionsByLesson(
  lessonIds: number[],
  database: Pick<typeof db, 'select'> = db,
): Promise<Map<number, LessonSession[]>> {
  const byLesson = new Map<number, LessonSession[]>()
  if (lessonIds.length === 0) return byLesson

  const rows = await database
    .select()
    .from(lessonSessions)
    .where(inArray(lessonSessions.lessonId, lessonIds))
    .orderBy(asc(lessonSessions.startsAt), asc(lessonSessions.index))

  for (const session of rows) {
    const arr = byLesson.get(session.lessonId) ?? []
    arr.push(toLessonSession(session))
    byLesson.set(session.lessonId, arr)
  }
  return byLesson
}

export async function fetchLessonSessions(
  lessonId: number,
  database: Pick<typeof db, 'select'> = db,
): Promise<LessonSession[]> {
  return (await fetchSessionsByLesson([lessonId], database)).get(lessonId) ?? []
}

export async function fetchLessonStudents(
  lessonId: number,
  database: Pick<typeof db, 'select'> = db,
): Promise<LessonStudent[]> {
  const rows = await database
    .select({
      wycNumber: wycDatabase.wycNumber,
      first: wycDatabase.first,
      last: wycDatabase.last,
      email: wycDatabase.email,
      phone1: wycDatabase.phone1,
    })
    .from(signups)
    .innerJoin(wycDatabase, eq(signups.student, wycDatabase.wycNumber))
    .where(eq(signups.class, lessonId))
    .orderBy(asc(signups.index))

  return rows.map((row) => ({
    wycNumber: row.wycNumber,
    first: row.first ?? '<Unknown>',
    last: row.last ?? '<Unknown>',
    email: row.email ?? '',
    phone1: row.phone1 ?? '',
  }))
}

type InstructorRefs = { instructor1: number | null; instructor2: number | null }

function instructorIdsOf(lesson: InstructorRefs): number[] {
  return [lesson.instructor1, lesson.instructor2].filter(
    (id): id is number => id != null && id !== 0,
  )
}

export async function fetchInstructorEmails(
  ids: number[],
  database: Pick<typeof db, 'select'> = db,
): Promise<Map<number, string>> {
  if (ids.length === 0) return new Map()
  const rows = await database
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
    typeId: lesson.classTypeId,
    size: lesson.size,
    subtype: lesson.subtype,
    sessions: lesson.sessions,
    instructor1Name: lesson.instructor1Name,
    instructor1Email: instructorEmails.get(lesson.instructor1) ?? '',
    instructor2Name: lesson.instructor2Name,
    instructor2Email: lesson.instructor2 ? (instructorEmails.get(lesson.instructor2) ?? '') : '',
  }
}

/** Batch the two steps yourself when building info for more than one lesson. */
export async function fetchLessonEmailInfo(
  lesson: RichLesson,
  database: Pick<typeof db, 'select'> = db,
): Promise<LessonEmailInfo> {
  return toLessonEmailInfo(lesson, await fetchInstructorEmails(instructorIdsOf(lesson), database))
}

export function allInstructorIds(lessons: InstructorRefs[]) {
  return [...new Set(lessons.flatMap(instructorIdsOf))]
}

export function withLessonFilters<T extends PgSelect>(qb: T, filters: LessonFilters | undefined) {
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
      conditions.push(gte(lessonQuarterIndex, quarter))
    } else {
      conditions.push(eq(lessonQuarterIndex, quarter))
    }
  }

  if (filters?.search) {
    const pattern = `%${filters.search}%`
    conditions.push(or(ilike(lessons.subtype, pattern), ilike(lessons.description, pattern)))
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
    .orderBy(sql`${lessons.calendarDate} desc nulls last`)
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
    .where(and(eq(signups.student, wycNumber), gte(lessonQuarterIndex, minExpire)))
    .orderBy(sql`${lessons.calendarDate} asc nulls last`)
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
    .orderBy(sql`${lessons.calendarDate} desc nulls last`)
}

export function lessonIdsEndingOnOrAfter(date: string) {
  return db
    .select({ id: lessonSessions.lessonId })
    .from(lessonSessions)
    .where(gte(lessonSessions.endsAt, `${date} 00:00:00`))
}

export async function insertEligibleSignup(lessonIndex: number, userId: number) {
  const result = await db.execute(sql`
    insert into ${signups} ("class", "student")
    select ${lessons.index}, ${wycDatabase.wycNumber}
    from ${lessons} join ${wycDatabase} on ${wycDatabase.wycNumber} = ${userId}
    where ${lessons.index} = ${lessonIndex}
      and ${wycDatabase.expireQtrIndex} >= ${lessonQuarterIndex}
  `)
  return result.rowCount === 1
}
