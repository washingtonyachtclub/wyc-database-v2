import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { toMemberRating } from 'src/db/mappers'
import type { RatingFilters } from 'src/db/rating-filter-types'
import type { RatingInsertData } from 'src/db/rating-schema'
import {
  baseAllRatingsCountQuery,
  baseAllRatingsQuery,
  ratingSortColumns,
  withRatingFilters,
} from 'src/db/rating-queries'
import { withPagination, withSorting } from 'src/db/query-helpers'
import { ratings, wycRatings } from 'src/db/schema'
import db from '../db/index'
import { requireAuth } from './auth-middleware'

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
    await requireAuth()

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
  })

export const getRatingById = createServerFn({ method: 'GET' })
  .inputValidator((input: { index: number }) => ({ index: input.index }))
  .handler(async ({ data: { index } }) => {
    await requireAuth()
    const [row] = await baseAllRatingsQuery().where(eq(wycRatings.index, index))
    if (!row) return null
    return toMemberRating(row)
  })

export const getRatingTypes = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAuth()
  return db.select({ index: ratings.index, text: ratings.text }).from(ratings)
})

export const updateRatingComments = createServerFn({ method: 'POST' })
  .inputValidator((input: { index: number; comments: string }) => input)
  .handler(async ({ data: { index, comments } }) => {
    await requireAuth()
    await db.update(wycRatings).set({ comments }).where(eq(wycRatings.index, index))
    return { success: true }
  })

export const createRating = createServerFn({ method: 'POST' })
  .inputValidator((input: RatingInsertData) => input)
  .handler(async ({ data }) => {
    await requireAuth()
    await db.insert(wycRatings).values(data)
    return { success: true }
  })

export const deleteRating = createServerFn({ method: 'POST' })
  .inputValidator((input: { index: number }) => input)
  .handler(async ({ data: { index } }) => {
    await requireAuth()
    await db.delete(wycRatings).where(eq(wycRatings.index, index))
    return { success: true }
  })
