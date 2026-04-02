import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { toMemberRating } from '@/domains/members/schema'
import type { RatingFilters } from '@/domains/ratings/filter-types'
import type { RatingInsertData } from '@/domains/ratings/schema'
import {
  baseAllRatingsCountQuery,
  baseAllRatingsQuery,
  ratingSortColumns,
  withRatingFilters,
} from '@/domains/ratings/queries'
import { withPagination, withSorting } from 'src/db/query-helpers'
import { ratings, wycRatings } from 'src/db/schema'
import db from '@/db/index'
import { requirePrivilege } from '@/lib/auth/auth-middleware'

export const getAllRatings = createServerFn({ method: 'GET' })
  .inputValidator(
    (input: {
      pageIndex: number
      pageSize: number
      filters?: RatingFilters
      sorting?: { id: string; desc: boolean }
    }) => ({
      pageIndex: input.pageIndex,
      pageSize: input.pageSize,
      filters: input.filters,
      sorting: input.sorting,
    }),
  )
  .handler(async ({ data: { pageIndex, pageSize, filters, sorting } }) => {
    await requirePrivilege('rtgs')

    try {
      const query = baseAllRatingsQuery().$dynamic()
      withRatingFilters(query, filters)
      withSorting(query, sorting, ratingSortColumns, wycRatings.index)
      withPagination(query, pageIndex, pageSize)

      const raw = await query
      const data = raw.map(toMemberRating)

      const countQuery = baseAllRatingsCountQuery().$dynamic()
      withRatingFilters(countQuery, filters)
      const [totalCountResult] = await countQuery

      return { data, totalCount: totalCountResult.count }
    } catch (error) {
      console.error('Failed to fetch ratings:', error)
      throw new Error('Failed to fetch ratings')
    }
  })

export const getRatingById = createServerFn({ method: 'GET' })
  .inputValidator((input: { index: number }) => ({ index: input.index }))
  .handler(async ({ data: { index } }) => {
    await requirePrivilege('rtgs')
    try {
      const [row] = await baseAllRatingsQuery().where(eq(wycRatings.index, index))
      if (!row) return null
      return toMemberRating(row)
    } catch (error) {
      console.error('Failed to fetch rating:', error)
      throw new Error('Failed to fetch rating')
    }
  })

export const getRatingTypes = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePrivilege('rtgs')
  try {
    return await db.select({ index: ratings.index, text: ratings.text }).from(ratings)
  } catch (error) {
    console.error('Failed to fetch rating types:', error)
    throw new Error('Failed to fetch rating types')
  }
})

export const updateRatingComments = createServerFn({ method: 'POST' })
  .inputValidator((input: { index: number; comments: string }) => input)
  .handler(async ({ data: { index, comments } }) => {
    await requirePrivilege('rtgs')
    try {
      await db.update(wycRatings).set({ comments }).where(eq(wycRatings.index, index))
      return { success: true }
    } catch (error) {
      console.error('Failed to update rating comments:', error)
      throw new Error('Failed to update rating comments')
    }
  })

export const createRating = createServerFn({ method: 'POST' })
  .inputValidator((input: RatingInsertData) => input)
  .handler(async ({ data }) => {
    await requirePrivilege('rtgs')
    try {
      await db.insert(wycRatings).values(data)
      return { success: true }
    } catch (error) {
      console.error('Failed to create rating:', error)
      throw new Error('Failed to create rating')
    }
  })

export const deleteRating = createServerFn({ method: 'POST' })
  .inputValidator((input: { index: number }) => input)
  .handler(async ({ data: { index } }) => {
    await requirePrivilege('rtgs')
    try {
      await db.delete(wycRatings).where(eq(wycRatings.index, index))
      return { success: true }
    } catch (error) {
      console.error('Failed to delete rating:', error)
      throw new Error('Failed to delete rating')
    }
  })
