import { and, count, desc, eq, gte } from 'drizzle-orm'
import type { MySqlColumn, MySqlSelect } from 'drizzle-orm/mysql-core'
import { alias } from 'drizzle-orm/mysql-core'
import db from './index'
import type { RatingFilters } from './rating-filter-types'
import { ratings, wycDatabase, wycRatings } from './schema'

const memberTable = alias(wycDatabase, 'member')
const examinerTable = alias(wycDatabase, 'examiner')

export const ratingSelectFields = {
  index: wycRatings.index,
  member: wycRatings.member,
  ratingIndex: wycRatings.rating,
  examiner: wycRatings.examiner,
  ratingText: ratings.text,
  ratingDegree: ratings.degree,
  ratingExpires: ratings.expires,
  date: wycRatings.date,
  memberFirst: memberTable.first,
  memberLast: memberTable.last,
  examinerFirst: examinerTable.first,
  examinerLast: examinerTable.last,
  comments: wycRatings.comments,
}

export type RatingQueryRow = Awaited<ReturnType<typeof baseMemberRatingsQuery>>[number]

export function baseMemberRatingsQuery(wycNumber: number) {
  return db
    .select(ratingSelectFields)
    .from(wycRatings)
    .leftJoin(ratings, eq(ratings.index, wycRatings.rating))
    .leftJoin(memberTable, eq(wycRatings.member, memberTable.wycNumber))
    .leftJoin(examinerTable, eq(wycRatings.examiner, examinerTable.wycNumber))
    .where(eq(wycRatings.member, wycNumber))
    .orderBy(desc(wycRatings.date))
}

export function baseAllRatingsQuery() {
  return db
    .select(ratingSelectFields)
    .from(wycRatings)
    .leftJoin(ratings, eq(ratings.index, wycRatings.rating))
    .leftJoin(memberTable, eq(wycRatings.member, memberTable.wycNumber))
    .leftJoin(examinerTable, eq(wycRatings.examiner, examinerTable.wycNumber))
}

export function baseAllRatingsCountQuery() {
  return db
    .select({ count: count() })
    .from(wycRatings)
    .leftJoin(ratings, eq(ratings.index, wycRatings.rating))
    .leftJoin(memberTable, eq(wycRatings.member, memberTable.wycNumber))
    .leftJoin(examinerTable, eq(wycRatings.examiner, examinerTable.wycNumber))
}

export const ratingSortColumns: Record<string, MySqlColumn> = {
  date: wycRatings.date,
  ratingText: ratings.text,
  memberName: memberTable.last,
  examinerName: examinerTable.last,
}

export function withRatingFilters<T extends MySqlSelect>(
  qb: T,
  filters: RatingFilters | undefined,
) {
  const conditions = []

  if (filters?.ratingIndex !== undefined) {
    conditions.push(eq(wycRatings.rating, filters.ratingIndex))
  }

  if (filters?.memberWycNumber !== undefined) {
    conditions.push(eq(wycRatings.member, filters.memberWycNumber))
  }

  if (conditions.length > 0) {
    qb.where(and(...conditions))
  }

  return qb
}

export function baseRatingsGivenQuery(wycNumber: number, since?: string) {
  const conditions = [eq(wycRatings.examiner, wycNumber)]
  if (since) {
    conditions.push(gte(wycRatings.date, since))
  }

  return db
    .select(ratingSelectFields)
    .from(wycRatings)
    .leftJoin(ratings, eq(ratings.index, wycRatings.rating))
    .leftJoin(memberTable, eq(wycRatings.member, memberTable.wycNumber))
    .leftJoin(examinerTable, eq(wycRatings.examiner, examinerTable.wycNumber))
    .where(and(...conditions))
    .orderBy(desc(wycRatings.date))
}
