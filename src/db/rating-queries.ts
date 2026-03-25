import { and, desc, eq, gte } from 'drizzle-orm'
import { alias } from 'drizzle-orm/mysql-core'
import db from './index'
import { ratings, wycDatabase, wycRatings } from './schema'

const memberTable = alias(wycDatabase, 'member')
const examinerTable = alias(wycDatabase, 'examiner')

export const ratingSelectFields = {
  index: wycRatings.index,
  ratingText: ratings.text,
  ratingDegree: ratings.degree,
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
