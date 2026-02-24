import { and, asc, count, desc, eq, gte, like, or, sql } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import { memcat, noyes, quarters, wycDatabase } from 'src/db/schema'
import db from '../db/index'
import { requireAuth } from '../lib/auth-middleware'
import { hashPassword } from '../lib/auth'
import type { Member } from 'src/db/schema'

export const memberSelectFields = {
  wycNumber: wycDatabase.wycNumber,
  first: sql<string>`COALESCE(${wycDatabase.first}, '')`.as('first'),
  last: sql<string>`COALESCE(${wycDatabase.last}, '')`.as('last'),
  category: sql<string>`COALESCE(${memcat.text}, 'Unknown')`.as('category'),
  expireQtr: sql<string>`COALESCE(${quarters.school}, 'N/A')`.as('expireQtr'),
  expireQtrIndex: wycDatabase.expireQtr,
  joinDate: wycDatabase.joinDate,
}

export const getMembersTable = createServerFn({ method: 'GET' })
  .inputValidator(
    (input: {
      pageIndex: number
      pageSize: number
      filters?: {
        wycId?: string
        name?: string
        category?: number
        expireQtr?: number
        expireQtrMode?: 'exactly' | 'atLeast'
      }
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
      const pageIndex = data.pageIndex
      const pageSize = data.pageSize
      const offset = pageIndex * pageSize
      const filters = data.filters
      const sorting = data.sorting

      const whereConditions = []

      if (filters?.wycId) {
        const wycIdNum = Number(filters.wycId)
        if (!isNaN(wycIdNum)) {
          whereConditions.push(eq(wycDatabase.wycNumber, wycIdNum))
        }
      }

      if (filters?.name) {
        const trimmedName = filters.name.trim()
        const nameParts = trimmedName.split(/\s+/).filter((part) => part.length > 0)

        if (nameParts.length >= 2) {
          const firstNamePattern = `%${nameParts[0]}%`
          const lastNamePattern = `${nameParts.slice(1).join(' ')}%`
          whereConditions.push(
            and(
              like(wycDatabase.first, firstNamePattern),
              like(wycDatabase.last, lastNamePattern),
            )!,
          )
        } else if (nameParts.length === 1) {
          const namePattern = `%${nameParts[0]}%`
          whereConditions.push(
            or(
              like(wycDatabase.first, namePattern),
              like(wycDatabase.last, namePattern),
            ),
          )
        }
      }

      if (filters?.category !== undefined && filters.category !== null) {
        whereConditions.push(eq(wycDatabase.category, filters.category))
      }

      if (filters?.expireQtr !== undefined && filters.expireQtr !== null) {
        if (filters.expireQtrMode === 'atLeast') {
          whereConditions.push(gte(wycDatabase.expireQtr, filters.expireQtr))
        } else {
          whereConditions.push(eq(wycDatabase.expireQtr, filters.expireQtr))
        }
      }

      const baseQuery = db
        .select(memberSelectFields)
        .from(wycDatabase)
        .leftJoin(memcat, eq(memcat.index, wycDatabase.category))
        .leftJoin(quarters, eq(quarters.index, wycDatabase.expireQtr))
        .leftJoin(noyes, eq(noyes.index, wycDatabase.outToSea))

      const queryWithWhere =
        whereConditions.length > 0
          ? baseQuery.where(and(...whereConditions))
          : baseQuery

      let membersQuery
      if (sorting?.id === 'expireQtr') {
        membersQuery = sorting.desc
          ? queryWithWhere.orderBy(desc(wycDatabase.expireQtr))
          : queryWithWhere.orderBy(asc(wycDatabase.expireQtr))
      } else if (sorting?.id === 'joinDate') {
        membersQuery = sorting.desc
          ? queryWithWhere.orderBy(desc(wycDatabase.joinDate))
          : queryWithWhere.orderBy(asc(wycDatabase.joinDate))
      } else {
        membersQuery = queryWithWhere.orderBy(desc(wycDatabase.joinDate))
      }

      const members = await membersQuery.limit(pageSize).offset(offset)

      const baseCountQuery = db.select({ count: count() }).from(wycDatabase)
      const countQuery =
        whereConditions.length > 0
          ? baseCountQuery.where(and(...whereConditions))
          : baseCountQuery

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
    return result[0]?.wycNumber ?? 0
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
  .inputValidator((data: Member) => data)
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
