import { createServerFn } from '@tanstack/react-start'
import { count, eq } from 'drizzle-orm'
import { toRatingType } from '@/domains/rating-types/schema'
import type { RatingTypeInsertData } from '@/domains/rating-types/schema'
import { ratings, wycRatings } from '@/db/schema'
import db from '@/db/index'
import { requirePrivilege } from '@/lib/auth/auth-middleware'

export const getAllRatingTypes = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePrivilege('rtgs')
  try {
    const raw = await db.select().from(ratings).orderBy(ratings.type, ratings.degree)
    const usage = await db
      .select({ rating: wycRatings.rating, n: count() })
      .from(wycRatings)
      .groupBy(wycRatings.rating)
    const counts = new Map(usage.map((u) => [u.rating, u.n]))
    return raw.map((r) => toRatingType(r, counts.get(r.index) ?? 0))
  } catch (error) {
    console.error('Failed to fetch rating types:', error)
    throw new Error('Failed to fetch rating types')
  }
})

export const getDistinctRatingTypeNames = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePrivilege('rtgs')
  try {
    const rows = await db.selectDistinct({ type: ratings.type }).from(ratings)
    return rows.map((r) => r.type).filter(Boolean)
  } catch (error) {
    console.error('Failed to fetch distinct rating type names:', error)
    throw new Error('Failed to fetch distinct rating type names')
  }
})

export const deleteRatingType = createServerFn({ method: 'POST' })
  .inputValidator((input: { index: number }) => input)
  .handler(async ({ data: { index } }) => {
    await requirePrivilege('rtgs')
    const [{ n }] = await db
      .select({ n: count() })
      .from(wycRatings)
      .where(eq(wycRatings.rating, index))
    if (n > 0) throw new Error(`Cannot delete: ${n} member rating(s) still use this type.`)
    try {
      await db.delete(ratings).where(eq(ratings.index, index))
      return { success: true }
    } catch (error) {
      console.error('Failed to delete rating type:', error)
      throw new Error('Failed to delete rating type')
    }
  })

export const createRatingType = createServerFn({ method: 'POST' })
  .inputValidator((input: RatingTypeInsertData) => input)
  .handler(async ({ data }) => {
    await requirePrivilege('rtgs')
    try {
      await db.insert(ratings).values({
        ...data,
        expires: data.expires ? 1 : 0,
      })
      return { success: true }
    } catch (error) {
      console.error('Failed to create rating type:', error)
      throw new Error('Failed to create rating type')
    }
  })
