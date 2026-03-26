import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, desc, eq, gte, lte } from 'drizzle-orm'
import { baseLessonsSignedUpQuery, baseLessonsTaughtQuery } from 'src/db/lesson-queries'
import {
  fromMemberInsert,
  toMember,
  toMemberRating,
  toMemberTableRow,
  toRichLesson,
} from 'src/db/mappers'
import type { MemberFilters } from 'src/db/member-filter-types'
import { baseMemberQuery, memberSortColumns, withMemberFilters } from 'src/db/member-queries'
import { withPagination, withSorting } from 'src/db/query-helpers'
import { baseMemberRatingsQuery, baseRatingsGivenQuery } from 'src/db/rating-queries'
import { memcat, quarters, wycDatabase } from 'src/db/schema'
import type { MemberInsert, MemberProfileUpdate } from 'src/db/types'
import db from '../db/index'
import {
  requireAuth,
  requirePrivilege,
  requireSelfOrPrivilege,
  sessionHasPrivilege,
} from '../lib/auth-middleware'

export const getMembersTable = createServerFn({ method: 'GET' })
  .inputValidator(
    (input: {
      pageIndex: number
      pageSize: number
      filters?: MemberFilters
      sorting?: { id: string; desc: boolean }
    }) => {
      return {
        pageIndex: input.pageIndex,
        pageSize: input.pageSize,
        filters: input.filters,
        sorting: input.sorting,
      }
    },
  )
  .handler(async ({ data }) => {
    await requirePrivilege('db')

    try {
      const { pageIndex, pageSize, filters, sorting } = data

      const query = baseMemberQuery().$dynamic()

      withMemberFilters(query, filters)
      withSorting(query, sorting, memberSortColumns, wycDatabase.joinDate)
      withPagination(query, pageIndex, pageSize)

      const rawMembers = await query
      const members = rawMembers.map(toMemberTableRow)

      const countQuery = db.select({ count: count() }).from(wycDatabase).$dynamic()

      withMemberFilters(countQuery, filters)

      const [totalCountResult] = await countQuery
      const totalCount = totalCountResult.count

      return {
        data: members,
        totalCount,
      }
    } catch (error: any) {
      console.error('Database query error:', error)
      const errorMessage = error?.message || error?.toString() || 'Unknown database error'
      const errorCode = error?.code || 'NO_CODE'
      throw new Error(`Failed to fetch members: ${errorMessage} (Code: ${errorCode})`)
    }
  })

export const getNextWycNumber = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePrivilege('db')
  const mostRecentWycNumberRow = await db
    .select({ wycNumber: wycDatabase.wycNumber })
    .from(wycDatabase)
    .orderBy(desc(wycDatabase.joinDate))
    .limit(1)

  if (mostRecentWycNumberRow.length === 0) {
    return 1
  }
  const mostRecentWycNumber = mostRecentWycNumberRow[0].wycNumber

  let setSize = 100
  while (true) {
    const takenWycNumbers = await db
      .select({ wycNumber: wycDatabase.wycNumber })
      .from(wycDatabase)
      .where(
        and(
          gte(wycDatabase.wycNumber, mostRecentWycNumber + 1),
          lte(wycDatabase.wycNumber, mostRecentWycNumber + setSize),
        ),
      )

    const takenWycNumbersSet = new Set(
      takenWycNumbers.map((row: { wycNumber: number }) => row.wycNumber),
    )
    // if there is a ID available
    if (takenWycNumbersSet.size < setSize) {
      let candidateWycNumber = mostRecentWycNumber + 1
      while (takenWycNumbersSet.has(candidateWycNumber)) {
        candidateWycNumber++
      }
      return candidateWycNumber
    }
    setSize *= 2
  }
})

export const getCategories = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAuth()
  const result = await db.select().from(memcat).orderBy(memcat.index)
  return result
})

export const getQuarters = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAuth()
  const result = await db.select().from(quarters).orderBy(desc(quarters.index))
  return result
})

export const createMember = createServerFn({ method: 'POST' })
  .inputValidator((data: MemberInsert) => data)
  .handler(async ({ data }) => {
    await requirePrivilege('db')
    try {
      const newMember = await db
        .insert(wycDatabase)
        .values({
          ...fromMemberInsert(data),
          wycNumber: await getNextWycNumber(),
        })
        .$returningId()
      return { success: true, id: newMember, data }
    } catch (error: any) {
      let errorMessage = 'Failed to add member'

      if (error?.code === 'ER_NO_DEFAULT_FOR_FIELD') {
        errorMessage = `Missing required field: ${error.message}`
      } else if (error?.code === 'ER_DATA_TOO_LONG') {
        errorMessage = `Data too long for one or more fields. Please check your input.`
      } else if (error?.code === 'ER_BAD_NULL_ERROR') {
        errorMessage = `Required field is null: ${error.message}`
      } else if (error?.message) {
        errorMessage = `Database error: ${error.message}`
      }

      throw new Error(errorMessage)
    }
  })

export const updateMember = createServerFn({ method: 'POST' })
  .inputValidator((input: { wycNumber: number } & MemberInsert) => ({
    ...input,
    wycNumber: Number(input.wycNumber),
  }))
  .handler(async ({ data }) => {
    await requirePrivilege('db')
    const { wycNumber, ...rest } = data
    const row = fromMemberInsert(rest)
    await db.update(wycDatabase).set(row).where(eq(wycDatabase.wycNumber, wycNumber))
    return { success: true, wycNumber }
  })

export const getAllMembersLite = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePrivilege('db')
  const result = await db
    .select({
      wycNumber: wycDatabase.wycNumber,
      first: wycDatabase.first,
      last: wycDatabase.last,
      email: wycDatabase.email,
      expireQtrIndex: wycDatabase.expireQtrIndex,
    })
    .from(wycDatabase)
    .orderBy(asc(wycDatabase.first), asc(wycDatabase.last))
  return result
})

export const getMemberById = createServerFn({ method: 'GET' })
  .inputValidator((input: { wycNumber: number }) => ({ wycNumber: Number(input.wycNumber) }))
  .handler(async ({ data: { wycNumber } }) => {
    await requireSelfOrPrivilege(wycNumber, 'db')
    const [row] = await db.select().from(wycDatabase).where(eq(wycDatabase.wycNumber, wycNumber))
    if (!row) return null
    return toMember(row)
  })

export const updateMemberProfile = createServerFn({ method: 'POST' })
  .inputValidator((input: { wycNumber: number } & MemberProfileUpdate) => ({
    ...input,
    wycNumber: Number(input.wycNumber),
  }))
  .handler(async ({ data }) => {
    await requireSelfOrPrivilege(data.wycNumber, 'db')
    const hasDb = await sessionHasPrivilege('db')
    const { wycNumber, outToSea, categoryId, expireQtrIndex, ...rest } = data

    const updateData: Record<string, unknown> = { ...rest }
    // Admin-only fields — only applied if user has db privilege
    if (hasDb) {
      updateData.outToSea = outToSea ? 1 : 0
      updateData.categoryId = categoryId
      updateData.expireQtrIndex = expireQtrIndex
    }

    await db
      .update(wycDatabase)
      .set(updateData)
      .where(eq(wycDatabase.wycNumber, wycNumber))
    return { success: true, wycNumber }
  })

export const getMemberRatings = createServerFn({ method: 'GET' })
  .inputValidator((input: { wycNumber: number }) => ({ wycNumber: Number(input.wycNumber) }))
  .handler(async ({ data: { wycNumber } }) => {
    await requireSelfOrPrivilege(wycNumber, 'db')
    const raw = await baseMemberRatingsQuery(wycNumber)
    return raw.map(toMemberRating)
  })

export const getMemberRatingsGiven = createServerFn({ method: 'GET' })
  .inputValidator((input: { wycNumber: number; since?: string }) => ({
    wycNumber: Number(input.wycNumber),
    since: input.since,
  }))
  .handler(async ({ data: { wycNumber, since } }) => {
    await requireSelfOrPrivilege(wycNumber, 'db')
    const raw = await baseRatingsGivenQuery(wycNumber, since)
    return raw.map(toMemberRating)
  })

export const getMemberLessonsTaught = createServerFn({ method: 'GET' })
  .inputValidator((input: { wycNumber: number; since?: string }) => ({
    wycNumber: Number(input.wycNumber),
    since: input.since,
  }))
  .handler(async ({ data: { wycNumber, since } }) => {
    await requireSelfOrPrivilege(wycNumber, 'db')
    const raw = await baseLessonsTaughtQuery(wycNumber, since)
    return raw.map(toRichLesson)
  })

export const getMemberLessonsSignedUp = createServerFn({ method: 'GET' })
  .inputValidator((input: { wycNumber: number; since?: string }) => ({
    wycNumber: Number(input.wycNumber),
    since: input.since,
  }))
  .handler(async ({ data: { wycNumber, since } }) => {
    await requireSelfOrPrivilege(wycNumber, 'db')
    const raw = await baseLessonsSignedUpQuery(wycNumber, since)
    return raw.map(toRichLesson)
  })

export const getDatabaseName = createServerFn({ method: 'GET' }).handler(async () => {
  const url = process.env.DATABASE_URL ?? ''
  return url.split('/').pop() ?? 'unknown'
})
