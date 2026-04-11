import { createServerFn } from '@tanstack/react-start'
import db from '@/db/index'
import { withPagination, withSorting } from '@/db/query-helpers'
import { boatTypes, checkouts } from '@/db/schema'
import {
  baseAllCheckoutsCountQuery,
  baseAllCheckoutsQuery,
  baseCheckoutsQuery,
  checkoutSortColumns,
  withCheckoutFilters,
} from '@/domains/checkouts/queries'
import { toCheckout, toCheckoutTableRow } from '@/domains/checkouts/schema'
import { requirePrivilege, requireSelfOrPrivilege } from '@/lib/auth/auth-middleware'
import type { CheckoutFilters } from './filter-types'

export const getCheckouts = createServerFn({ method: 'GET' })
  .inputValidator((input: { wycNumber?: number; since?: string }) => ({
    wycNumber: input.wycNumber ? Number(input.wycNumber) : undefined,
    since: input.since,
  }))
  .handler(async ({ data }) => {
    // wycNumber is optional in the query, but on the profile page it's always provided
    await requireSelfOrPrivilege(data.wycNumber ?? 0, 'db')
    const raw = await baseCheckoutsQuery(data)
    return raw.map(toCheckout)
  })

export const getAllCheckouts = createServerFn({ method: 'GET' })
  .inputValidator(
    (input: {
      pageIndex: number
      pageSize: number
      filters?: CheckoutFilters
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
      const query = baseAllCheckoutsQuery().$dynamic()
      withCheckoutFilters(query, filters)
      withSorting(query, sorting, checkoutSortColumns, checkouts.timeDeparture)
      withPagination(query, pageIndex, pageSize)

      const raw = await query
      const data = raw.map(toCheckoutTableRow)

      const countQuery = baseAllCheckoutsCountQuery().$dynamic()
      withCheckoutFilters(countQuery, filters)
      const [totalCountResult] = await countQuery

      return { data, totalCount: totalCountResult.count }
    } catch (error) {
      console.error('Failed to fetch checkouts:', error)
      throw new Error('Failed to fetch checkouts')
    }
  })

export const getCheckoutBoatTypes = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePrivilege('db', 'rtgs')
  try {
    return await db
      .select({ index: boatTypes.index, type: boatTypes.type, fleet: boatTypes.fleet })
      .from(boatTypes)
      .orderBy(boatTypes.fleet, boatTypes.type)
  } catch (error) {
    console.error('Failed to fetch boat types for checkouts:', error)
    throw new Error('Failed to fetch boat types')
  }
})
