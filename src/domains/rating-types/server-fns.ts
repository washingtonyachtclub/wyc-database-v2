import { createServerFn } from '@tanstack/react-start'
import { toRatingType } from '@/domains/rating-types/schema'
import type { RatingTypeInsertData } from '@/domains/rating-types/schema'
import { ratings } from 'src/db/schema'
import db from '@/db/index'
import { requirePrivilege } from '@/lib/auth/auth-middleware'

export const getAllRatingTypes = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePrivilege('rtgs')
  try {
    const raw = await db.select().from(ratings).orderBy(ratings.type, ratings.degree)
    return raw.map(toRatingType)
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
