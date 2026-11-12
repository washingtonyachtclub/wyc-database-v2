import { hasPrivilege } from '@/lib/permissions'
import { canManageRating, isRatingOwner } from '@/lib/resource-permissions'
import { useRefreshedAppSession } from '@/lib/auth/session'
import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { toMemberRating } from '@/domains/members/schema'
import type { RatingFilters } from '@/domains/ratings/filter-types'
import type { RatingInsertData } from '@/domains/ratings/schema'
import {
  baseAllRatingsCountQuery,
  baseAllRatingsQuery,
  getActiveMemberRatings,
  ratingSortColumns,
  withRatingFilters,
} from '@/domains/ratings/queries'
import { notifyDoorUnlocks } from '@/domains/door-codes/notify'
import type { DoorCodeSlug } from '@/domains/door-codes/rules'
import { unlockedSlugs } from '@/domains/door-codes/rules'
import { withPagination, withSorting } from '@/db/query-helpers'
import { str } from '@/db/mapper-utils'
import { ratings, wycRatings } from '@/db/schema'
import db from '@/db/index'
import {
  requireAuth,
  requirePrivilege,
  requireRatingManagement,
  sessionHasPrivilege,
} from '@/lib/auth/auth-middleware'

export const getAllRatings = createServerFn({ method: 'GET' })
  .validator(
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
    await requirePrivilege('db', 'rtgs')

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
  .validator((input: { index: number }) => ({ index: input.index }))
  .handler(async ({ data: { index } }) => {
    await requireAuth()
    const session = await useRefreshedAppSession()
    try {
      const [row] = await baseAllRatingsQuery().where(eq(wycRatings.index, index))
      if (!row) return null
      const canManage = canManageRating(session.data, row)
      if (
        !isRatingOwner(session.data, row) &&
        !hasPrivilege(session.data.privileges ?? [], ['db', 'rtgs'])
      ) {
        throw new Error('Forbidden: Insufficient privileges')
      }
      return { ...toMemberRating(row), canManageRating: canManage }
    } catch (error) {
      console.error('Failed to fetch rating:', error)
      throw new Error('Failed to fetch rating')
    }
  })

export const getRatingTypes = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePrivilege('rtgs', 'db')
  try {
    const rows = await db
      .select({ index: ratings.index, text: ratings.text, type: ratings.type })
      .from(ratings)
      .orderBy(ratings.type, ratings.degree)
    return rows.map((row) => ({ ...row, text: str(row.text) }))
  } catch (error) {
    console.error('Failed to fetch rating types:', error)
    throw new Error('Failed to fetch rating types')
  }
})

export const updateRatingComments = createServerFn({ method: 'POST' })
  .validator((input: { index: number; comments: string }) => input)
  .handler(async ({ data: { index, comments } }) => {
    await requireRatingManagement(index)
    try {
      await db.update(wycRatings).set({ comments }).where(eq(wycRatings.index, index))
      return { success: true }
    } catch (error) {
      console.error('Failed to update rating comments:', error)
      throw new Error('Failed to update rating comments')
    }
  })

export const createRating = createServerFn({ method: 'POST' })
  .validator((input: RatingInsertData) => input)
  .handler(async ({ data }) => {
    const userId = await requirePrivilege('db', 'rtgs')
    const examiner = (await sessionHasPrivilege('db')) ? data.examiner : userId

    let before: DoorCodeSlug[] = []
    try {
      before = unlockedSlugs(await getActiveMemberRatings(data.member))
      await db.insert(wycRatings).values({ ...data, examiner, enteredBy: userId })
    } catch (error) {
      console.error('Failed to create rating:', error)
      throw new Error('Failed to create rating')
    }

    const { emailSent, emailSimulated } = await notifyDoorUnlocks({
      wycNumber: data.member,
      ratingIndex: data.rating,
      before,
    })
    return { success: true, emailSent, emailSimulated }
  })

export const deleteRating = createServerFn({ method: 'POST' })
  .validator((input: { index: number }) => input)
  .handler(async ({ data: { index } }) => {
    await requireRatingManagement(index)
    try {
      await db.delete(wycRatings).where(eq(wycRatings.index, index))
      return { success: true }
    } catch (error) {
      console.error('Failed to delete rating:', error)
      throw new Error('Failed to delete rating')
    }
  })
