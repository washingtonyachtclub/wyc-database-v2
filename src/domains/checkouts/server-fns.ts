import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, gte, inArray, isNotNull, isNull, like, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import db from '@/db/index'
import { fullName, str } from '@/db/mapper-utils'
import { withPagination, withSorting } from '@/db/query-helpers'
import {
  boatTypes,
  checkouts,
  crew,
  guests,
  lessonQuarter,
  memcat,
  quarters,
  ratings,
  wycDatabase,
  wycRatings,
} from '@/db/schema'
import {
  baseAllCheckoutsCountQuery,
  baseAllCheckoutsQuery,
  baseCheckoutCardsQuery,
  baseCheckoutsQuery,
  checkoutSortColumns,
  withCheckoutFilters,
} from '@/domains/checkouts/queries'
import {
  type CheckoutCrewMember,
  type CheckoutGuest,
  checkoutInsertSchema,
  guestStatusLabel,
  manualCheckoutInsertSchema,
  toCheckout,
  toCheckoutCard,
  toCheckoutTableRow,
} from '@/domains/checkouts/schema'
import { CheckoutWriteError, writeCheckout } from '@/domains/checkouts/write'
import {
  optionalAuth,
  requireAuth,
  requirePrivilege,
  requireSelfOrPrivilege,
  sessionHasPrivilege,
} from '@/lib/auth/auth-middleware'
import { getTodayPacificDateString } from '@/lib/date-utils'
import type { CheckoutFilters } from './filter-types'

export const getCheckouts = createServerFn({ method: 'GET' })
  .inputValidator((input: { wycNumber?: number; since?: string }) => ({
    wycNumber: input.wycNumber ? Number(input.wycNumber) : undefined,
    since: input.since,
  }))
  .handler(async ({ data }) => {
    // wycNumber is optional in the query, but on the profile page it's always provided
    await requireSelfOrPrivilege(data.wycNumber ?? 0, 'db', 'rtgs')
    const raw = await baseCheckoutsQuery(data)
    return raw.map((row) => toCheckout(row, data.wycNumber))
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
      .select({
        index: boatTypes.index,
        type: boatTypes.type,
        fleet: boatTypes.fleet,
        active: boatTypes.active,
      })
      .from(boatTypes)
      .orderBy(boatTypes.fleet, boatTypes.type)
  } catch (error) {
    console.error('Failed to fetch boat types for checkouts:', error)
    throw new Error('Failed to fetch boat types')
  }
})

// --- Member-facing checkout page ---

const RECENT_LIMIT = 10
const WIND_STATION_ID = 'KWASEATT2938'
const WEATHER_UNDERGROUND_API_KEY = 'e1f10a1e78da46f5b10a1e78da96f525'
const MPH_TO_KNOTS = 0.868976

const windHistoryResponseSchema = z.object({
  observations: z.array(
    z.object({
      obsTimeLocal: z.string(),
      imperial: z.object({
        windspeedAvg: z.number().nullable(),
        windgustAvg: z.number().nullable(),
      }),
    }),
  ),
})

export const getWindHistory = createServerFn({ method: 'GET' }).handler(async () => {
  const pacificDate = getTodayPacificDateString()
  const params = new URLSearchParams({
    stationId: WIND_STATION_ID,
    format: 'json',
    units: 'e',
    numericPrecision: 'decimal',
    apiKey: WEATHER_UNDERGROUND_API_KEY,
  })

  try {
    const response = await fetch(`https://api.weather.com/v2/pws/observations/all/1day?${params}`)
    if (!response.ok) throw new Error(`Weather service returned ${response.status}`)
    const parsed = windHistoryResponseSchema.parse(await response.json())

    const readings = parsed.observations.flatMap((observation) => {
      if (!observation.obsTimeLocal.startsWith(pacificDate)) return []
      const time = observation.obsTimeLocal.slice(11, 16)
      const [hours, minutes] = time.split(':').map(Number)
      const { windspeedAvg, windgustAvg } = observation.imperial
      if (
        !Number.isFinite(hours) ||
        !Number.isFinite(minutes) ||
        windspeedAvg === null ||
        windgustAvg === null
      ) {
        return []
      }
      return [
        {
          minute: hours * 60 + minutes,
          windKnots: windspeedAvg * MPH_TO_KNOTS,
          gustKnots: windgustAvg * MPH_TO_KNOTS,
        },
      ]
    })

    return {
      date: pacificDate,
      readings,
    }
  } catch (error) {
    console.error('Failed to fetch wind history:', error)
    throw new Error('Wind history is currently unavailable')
  }
})

export const getCheckoutCards = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const me = await optionalAuth()
    const canAdminCheckIn = me !== null && (await sessionHasPrivilege('db'))
    const [active, returned] = await Promise.all([
      baseCheckoutCardsQuery().where(isNull(checkouts.timeReturn)).orderBy(desc(checkouts.index)),
      baseCheckoutCardsQuery()
        .where(isNotNull(checkouts.timeReturn))
        .orderBy(desc(checkouts.index))
        .limit(RECENT_LIMIT),
    ])

    const rows = [...active, ...returned]
    const ids = rows.map((r) => r.index)

    const crewByCheckout = new Map<number, CheckoutCrewMember[]>()
    const guestsByCheckout = new Map<number, CheckoutGuest[]>()

    if (ids.length > 0) {
      const crewRows = await db
        .select({
          checkoutId: crew.checkoutId,
          first: wycDatabase.first,
          last: wycDatabase.last,
          status: memcat.text,
          expiration: quarters.school,
        })
        .from(crew)
        .leftJoin(wycDatabase, eq(crew.crewId, wycDatabase.wycNumber))
        .leftJoin(memcat, eq(wycDatabase.categoryId, memcat.index))
        .leftJoin(quarters, eq(wycDatabase.expireQtrIndex, quarters.index))
        .where(inArray(crew.checkoutId, ids))
      for (const row of crewRows) {
        const list = crewByCheckout.get(row.checkoutId) ?? []
        list.push({
          name: fullName(row.first, row.last) || 'Unknown member',
          status: str(row.status).replace('Alumni', 'Public'),
          expiration: str(row.expiration),
        })
        crewByCheckout.set(row.checkoutId, list)
      }

      const guestRows = await db.select().from(guests).where(inArray(guests.checkoutId, ids))
      for (const row of guestRows) {
        const list = guestsByCheckout.get(row.checkoutId) ?? []
        list.push({
          name: str(row.name),
          status: guestStatusLabel(row.status),
        })
        guestsByCheckout.set(row.checkoutId, list)
      }
    }

    const toCard = (row: (typeof rows)[number]) =>
      toCheckoutCard(
        row,
        crewByCheckout.get(row.index) ?? [],
        guestsByCheckout.get(row.index) ?? [],
        me !== null && (row.wycNumber === me || canAdminCheckIn),
      )

    return { active: active.map(toCard), returned: returned.map(toCard) }
  } catch (error) {
    console.error('Failed to fetch checkout cards:', error)
    throw new Error('Failed to fetch checkouts')
  }
})

async function getRatingsForMember(wycNumber: number) {
  const rows = await db
    .selectDistinct({
      index: ratings.index,
      text: ratings.text,
      type: ratings.type,
      degree: ratings.degree,
    })
    .from(wycRatings)
    .innerJoin(ratings, eq(wycRatings.rating, ratings.index))
    .where(eq(wycRatings.member, wycNumber))
    .orderBy(ratings.type, ratings.degree)
  return rows.map((row) => ({ index: row.index, text: str(row.text), type: row.type }))
}

export const getMyRatings = createServerFn({ method: 'GET' }).handler(async () => {
  const me = await requireAuth()
  try {
    return await getRatingsForMember(me)
  } catch (error) {
    console.error('Failed to fetch member ratings:', error)
    throw new Error('Failed to fetch ratings')
  }
})

export const getCheckoutFormBoatTypes = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAuth()
  try {
    return await db
      .select({ index: boatTypes.index, type: boatTypes.type, fleet: boatTypes.fleet })
      .from(boatTypes)
      .where(eq(boatTypes.active, 1))
      .orderBy(boatTypes.fleet, boatTypes.type)
  } catch (error) {
    console.error('Failed to fetch boat types for checkout form:', error)
    throw new Error('Failed to fetch boat types')
  }
})

export const getCheckoutFormMembers = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAuth()
  try {
    const [currentQuarter] = await db
      .select({ index: lessonQuarter.quarter })
      .from(lessonQuarter)
      .where(eq(lessonQuarter.index, 1))
      .limit(1)
    if (!currentQuarter) throw new Error('Current quarter not found')

    return await db
      .select({
        wycNumber: wycDatabase.wycNumber,
        first: wycDatabase.first,
        last: wycDatabase.last,
      })
      .from(wycDatabase)
      .where(gte(wycDatabase.expireQtrIndex, currentQuarter.index))
      .orderBy(desc(wycDatabase.expireQtrIndex), wycDatabase.first, wycDatabase.last)
  } catch (error) {
    console.error('Failed to fetch members for checkout form:', error)
    throw new Error('Failed to fetch members')
  }
})

export const searchCheckoutMembers = createServerFn({ method: 'GET' })
  .inputValidator((input) => z.object({ query: z.string().trim().min(2).max(80) }).parse(input))
  .handler(async ({ data: { query } }) => {
    await requireAuth()
    try {
      const numericQuery = /^\d+$/.test(query)
      const conditions = numericQuery
        ? eq(wycDatabase.wycNumber, Number(query))
        : and(
            ...query.split(/\s+/).map((token) => {
              const escaped = token.replace(/[\\%_]/g, '\\$&')
              const pattern = `%${escaped}%`
              return or(like(wycDatabase.first, pattern), like(wycDatabase.last, pattern))
            }),
          )

      return await db
        .select({
          wycNumber: wycDatabase.wycNumber,
          first: wycDatabase.first,
          last: wycDatabase.last,
        })
        .from(wycDatabase)
        .where(conditions)
        .orderBy(desc(wycDatabase.expireQtrIndex), wycDatabase.first, wycDatabase.last)
        .limit(30)
    } catch (error) {
      console.error('Failed to search checkout members:', error)
      throw new Error('Failed to search members')
    }
  })

export const getCheckoutMembers = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePrivilege('db')
  try {
    return await db
      .select({
        wycNumber: wycDatabase.wycNumber,
        first: wycDatabase.first,
        last: wycDatabase.last,
      })
      .from(wycDatabase)
      .orderBy(desc(wycDatabase.expireQtrIndex), wycDatabase.first, wycDatabase.last)
  } catch (error) {
    console.error('Failed to fetch members for manual checkout:', error)
    throw new Error('Failed to fetch members')
  }
})

export const createCheckout = createServerFn({ method: 'POST' })
  .inputValidator((data) => checkoutInsertSchema.parse(data))
  .handler(async ({ data }) => {
    const me = await requireAuth()
    try {
      const checkoutId = await writeCheckout({
        skipperWycNumber: me,
        boatId: data.boatId,
        qualification: data.qualification,
        destination: data.destination === 'Other' ? data.otherDestination.trim() : data.destination,
        departure: data.departure,
        expectedReturn: data.expectedReturn,
        timeReturn: null,
        crew: data.crew,
        guests: data.guests,
        allowInactiveBoat: false,
      })
      return { success: true, id: checkoutId }
    } catch (error) {
      console.error('Failed to create checkout:', error)
      if (error instanceof CheckoutWriteError) throw new Error(error.message)
      throw new Error('Failed to create checkout')
    }
  })

export const createManualCheckout = createServerFn({ method: 'POST' })
  .inputValidator((data) => manualCheckoutInsertSchema.parse(data))
  .handler(async ({ data }) => {
    await requirePrivilege('db')
    try {
      const checkoutId = await writeCheckout({
        skipperWycNumber: data.skipperWycNumber,
        boatId: data.boatId,
        qualification: data.qualification,
        destination: data.destination === 'Other' ? data.otherDestination.trim() : data.destination,
        departure: data.departure,
        expectedReturn: data.timeReturn,
        timeReturn: data.timeReturn,
        crew: data.crew,
        guests: data.guests,
        allowInactiveBoat: true,
      })
      return { success: true, id: checkoutId }
    } catch (error) {
      console.error('Failed to create manual checkout:', error)
      if (error instanceof CheckoutWriteError) throw new Error(error.message)
      throw new Error('Failed to create manual checkout')
    }
  })

export const checkInBoat = createServerFn({ method: 'POST' })
  .inputValidator((input) => z.object({ index: z.coerce.number().int().min(1) }).parse(input))
  .handler(async ({ data: { index } }) => {
    let row: { wycNumber: number; timeReturn: string | null } | undefined
    try {
      const rows = await db
        .select({ wycNumber: checkouts.wycNumber, timeReturn: checkouts.timeReturn })
        .from(checkouts)
        .where(eq(checkouts.index, index))
        .limit(1)
      row = rows[0]
    } catch (error) {
      console.error('Failed to fetch checkout for check-in:', error)
      throw new Error('Failed to check in boat')
    }
    if (!row) throw new Error('Checkout not found')

    await requireSelfOrPrivilege(row.wycNumber, 'db')

    try {
      await db
        .update(checkouts)
        .set({ timeReturn: sql`NOW()` })
        .where(and(eq(checkouts.index, index), isNull(checkouts.timeReturn)))
      return { success: true }
    } catch (error) {
      console.error('Failed to check in boat:', error)
      throw new Error('Failed to check in boat')
    }
  })
