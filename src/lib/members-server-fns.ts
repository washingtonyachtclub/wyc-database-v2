import { asc, count, desc, eq } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import { memcat, quarters, wycDatabase } from 'src/db/schema'
import db from '../db/index'
import { requireAuth } from '../lib/auth-middleware'
import { hashPassword } from '../lib/auth'
import type { MemberRow } from 'src/db/types'
import { toMemberTableRow } from 'src/db/mappers'
import { withSorting, withPagination } from 'src/db/query-helpers'
import { withMemberFilters, memberSortColumns, type MemberFilters } from 'src/db/member-queries'

const memberTableSelectFields = {
  wycNumber: wycDatabase.wycNumber,
  first: wycDatabase.first,
  last: wycDatabase.last,
  category: memcat.text,
  expireQtrSchoolText: quarters.school,
  expireQtrIndex: wycDatabase.expireQtr,
  joinDate: wycDatabase.joinDate,
}

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
    await requireAuth()

    try {
      const { pageIndex, pageSize, filters, sorting } = data

      const query = db
        .select(memberTableSelectFields)
        .from(wycDatabase)
        .leftJoin(memcat, eq(memcat.index, wycDatabase.category))
        .leftJoin(quarters, eq(quarters.index, wycDatabase.expireQtr))
        .$dynamic()

      withMemberFilters(query, filters)
      withSorting(query, sorting, memberSortColumns, wycDatabase.joinDate)
      withPagination(query, pageIndex, pageSize)

      const rawMembers = await query
      const members = rawMembers.map(toMemberTableRow)

      const countQuery = db
        .select({ count: count() })
        .from(wycDatabase)
        .$dynamic()

      withMemberFilters(countQuery, filters)

      const [totalCountResult] = await countQuery
      const totalCount = totalCountResult.count

      return {
        data: members,
        totalCount,
      }
    } catch (error: any) {
      console.error('Database query error:', error)
      const errorMessage =
        error?.message || error?.toString() || 'Unknown database error'
      const errorCode = error?.code || 'NO_CODE'
      throw new Error(
        `Failed to fetch members: ${errorMessage} (Code: ${errorCode})`,
      )
    }
  })

export const getMostRecentWycNumber = createServerFn({ method: 'GET' }).handler(
  async () => {
    const result = await db
      .select({ wycNumber: wycDatabase.wycNumber })
      .from(wycDatabase)
      .orderBy(desc(wycDatabase.joinDate))
      .limit(1)
    return result[0]?.wycNumber ?? undefined
  },
)

export const getCategories = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireAuth()
    const result = await db.select().from(memcat).orderBy(memcat.index)
    return result
  },
)

export const getQuarters = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireAuth()
    const result = await db
      .select()
      .from(quarters)
      .orderBy(desc(quarters.index))
    return result
  },
)

export const addMember = createServerFn({ method: 'POST' })
  .inputValidator((data: MemberRow) => data)
  .handler(async ({ data }) => {
    await requireAuth()
    try {
      const hashedPassword = data.password
        ? hashPassword(data.password)
        : data.password

      const newMember = await db
        .insert(wycDatabase)
        .values({
          ...data,
          password: hashedPassword,
        })
        .$returningId()
      return { success: true, id: newMember, data }
    } catch (error: any) {
      let errorMessage = 'Failed to add member'

      if (
        error?.code === 'ER_DUP_ENTRY' ||
        error?.message?.includes('Duplicate entry')
      ) {
        errorMessage = `A member with WYC ID ${data.wycNumber} already exists. Please use a different number.`
      } else if (error?.code === 'ER_NO_DEFAULT_FOR_FIELD') {
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
