import { memberSearchQuery } from '@/domains/members/queries'
import { toMemberSearchResult } from '@/domains/members/schema'
import { rankMembers, MAX_MEMBER_SEARCH_RESULTS } from '@/domains/members/search'
import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { and, desc, eq, gte, isNotNull, isNull } from 'drizzle-orm'
import { z } from 'zod'
import db from '@/db/index'
import { fullName, str } from '@/db/mapper-utils'
import { inIdList, withPagination, withSorting } from '@/db/query-helpers'
import { compareBoatTypes } from '@/domains/boat-types/order'
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
  baseMemberCheckoutExportQuery,
  checkoutSortColumns,
  findCheckout,
  getCheckoutCrew,
  getCheckoutGuests,
  withCheckoutFilters,
} from '@/domains/checkouts/queries'
import {
  type CheckoutCrewMember,
  type CheckoutGuest,
  checkInSchema,
  checkoutEditSchema,
  checkoutIndexSchema,
  checkoutInsertSchema,
  guestStatusLabel,
  manualCheckoutInsertSchema,
  toCheckout,
  toCheckoutCard,
  toCheckoutEdit,
  toCheckoutTableRow,
  toDbDateTime,
  toMemberCheckoutExportRow,
} from '@/domains/checkouts/schema'
import { CheckoutWriteError, updateOpenCheckout, writeCheckout } from '@/domains/checkouts/write'
import {
  optionalAuth,
  requireAuth,
  requirePrivilege,
  requireSelfOrPrivilege,
  sessionHasPrivilege,
} from '@/lib/auth/auth-middleware'
import { getNowPacificDateTimeString, getTodayPacificDateString } from '@/lib/date-utils'
import type { CheckoutFilters } from './filter-types'

export const getCheckouts = createServerFn({ method: 'GET' })
  .validator((input: { wycNumber?: number; since?: string }) => ({
    wycNumber: input.wycNumber ? Number(input.wycNumber) : undefined,
    since: input.since,
  }))
  .handler(async ({ data }) => {
    // wycNumber is optional in the query, but on the profile page it's always provided
    await requireSelfOrPrivilege(data.wycNumber ?? 0, 'db', 'rtgs')
    const raw = await baseCheckoutsQuery(data)
    return raw.map((row) => toCheckout(row, data.wycNumber))
  })

export const getMemberCheckoutExport = createServerFn({ method: 'GET' })
  .validator((input) => z.object({ wycNumber: z.number().int().positive() }).parse(input))
  .handler(async ({ data: { wycNumber } }) => {
    await requireSelfOrPrivilege(wycNumber, 'db', 'rtgs')

    try {
      const raw = await baseMemberCheckoutExportQuery(wycNumber)
      if (raw.length === 0) return []

      const checkoutIds = raw.map((row) => row.index)
      const skipperByCheckout = new Map(raw.map((row) => [row.index, row.wycNumber]))
      const [crewRows, guestRows] = await Promise.all([
        db
          .select({
            checkoutId: crew.checkoutId,
            crewId: crew.crewId,
            first: wycDatabase.first,
            last: wycDatabase.last,
          })
          .from(crew)
          .innerJoin(wycDatabase, eq(crew.crewId, wycDatabase.wycNumber))
          .where(inIdList(crew.checkoutId, checkoutIds))
          .orderBy(crew.checkoutId, wycDatabase.last, wycDatabase.first),
        db
          .select({ checkoutId: guests.checkoutId, name: guests.name })
          .from(guests)
          .where(inIdList(guests.checkoutId, checkoutIds))
          .orderBy(guests.checkoutId, guests.name),
      ])

      const crewByCheckout = new Map<number, Set<string>>()
      for (const row of crewRows) {
        if (row.crewId === wycNumber || row.crewId === skipperByCheckout.get(row.checkoutId)) {
          continue
        }
        const name = fullName(row.first, row.last)
        if (!name) continue
        const names = crewByCheckout.get(row.checkoutId) ?? new Set<string>()
        names.add(name)
        crewByCheckout.set(row.checkoutId, names)
      }

      const guestsByCheckout = new Map<number, Set<string>>()
      for (const row of guestRows) {
        const name = str(row.name).trim()
        if (!name) continue
        const names = guestsByCheckout.get(row.checkoutId) ?? new Set<string>()
        names.add(name)
        guestsByCheckout.set(row.checkoutId, names)
      }

      return raw.map((row) =>
        toMemberCheckoutExportRow(
          row,
          wycNumber,
          [...(crewByCheckout.get(row.index) ?? [])],
          [...(guestsByCheckout.get(row.index) ?? [])],
        ),
      )
    } catch (error) {
      console.error('Failed to export member checkouts:', error)
      throw new Error('Failed to export checkouts')
    }
  })

export const getAllCheckouts = createServerFn({ method: 'GET' })
  .validator(
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
    const rows = await db
      .select({
        index: boatTypes.index,
        type: boatTypes.type,
        fleet: boatTypes.fleet,
        active: boatTypes.active,
      })
      .from(boatTypes)
    return rows.sort(compareBoatTypes)
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
    const canAdminCheckIn = me !== null && (await sessionHasPrivilege('db', 'rtgs'))
    const canAdminEdit = me !== null && (await sessionHasPrivilege('db'))
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
    const crewedCheckoutIds = new Set<number>()

    if (ids.length > 0) {
      const crewRows = await db
        .select({
          checkoutId: crew.checkoutId,
          wycNumber: crew.crewId,
          first: wycDatabase.first,
          last: wycDatabase.last,
          status: memcat.text,
          expiration: quarters.school,
        })
        .from(crew)
        .leftJoin(wycDatabase, eq(crew.crewId, wycDatabase.wycNumber))
        .leftJoin(memcat, eq(wycDatabase.categoryId, memcat.index))
        .leftJoin(quarters, eq(wycDatabase.expireQtrIndex, quarters.index))
        .where(inIdList(crew.checkoutId, ids))
      for (const row of crewRows) {
        if (row.wycNumber === me) crewedCheckoutIds.add(row.checkoutId)
        const list = crewByCheckout.get(row.checkoutId) ?? []
        list.push({
          name: fullName(row.first, row.last) || 'Unknown member',
          status: str(row.status).replace('Alumni', 'Public'),
          expiration: str(row.expiration),
        })
        crewByCheckout.set(row.checkoutId, list)
      }

      const guestRows = await db.select().from(guests).where(inIdList(guests.checkoutId, ids))
      for (const row of guestRows) {
        const list = guestsByCheckout.get(row.checkoutId) ?? []
        list.push({
          name: str(row.name),
          status: guestStatusLabel(row.status),
        })
        guestsByCheckout.set(row.checkoutId, list)
      }
    }

    const toCard = (row: (typeof rows)[number]) => {
      const isSkipper = row.wycNumber === me
      return toCheckoutCard(
        row,
        crewByCheckout.get(row.index) ?? [],
        guestsByCheckout.get(row.index) ?? [],
        {
          canCheckIn: isSkipper || canAdminCheckIn,
          canEdit: isSkipper || canAdminEdit,
          participation: isSkipper ? 'skipper' : crewedCheckoutIds.has(row.index) ? 'crew' : null,
        },
      )
    }

    const activeCards = active.map(toCard)
    activeCards.sort((a, b) => Number(Boolean(b.participation)) - Number(Boolean(a.participation)))
    return { active: activeCards, returned: returned.map(toCard) }
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
    const rows = await db
      .select({ index: boatTypes.index, type: boatTypes.type, fleet: boatTypes.fleet })
      .from(boatTypes)
      .where(eq(boatTypes.active, 1))
    return rows.sort(compareBoatTypes)
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
        expireQtrIndex: wycDatabase.expireQtrIndex,
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
  .validator((input) => z.object({ query: z.string().trim().min(1).max(80) }).parse(input))
  .handler(async ({ data: { query } }) => {
    await requireAuth()
    try {
      const members = (await memberSearchQuery()).map(toMemberSearchResult)
      return rankMembers(members, query, true).slice(0, MAX_MEMBER_SEARCH_RESULTS)
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
        expireQtrIndex: wycDatabase.expireQtrIndex,
      })
      .from(wycDatabase)
      .orderBy(desc(wycDatabase.expireQtrIndex), wycDatabase.first, wycDatabase.last)
  } catch (error) {
    console.error('Failed to fetch members for manual checkout:', error)
    throw new Error('Failed to fetch members')
  }
})

export const createCheckout = createServerFn({ method: 'POST' })
  .validator((data) => checkoutInsertSchema.parse(data))
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
  .validator((data) => manualCheckoutInsertSchema.parse(data))
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

async function requireOpenCheckoutEditor(index: number) {
  const me = await requireAuth()
  let checkout: Awaited<ReturnType<typeof findCheckout>>
  try {
    checkout = await findCheckout(index)
  } catch (error) {
    console.error('Failed to fetch checkout for editing:', error)
    throw new Error('Failed to load checkout')
  }
  if (!checkout) throw new Error('Checkout not found')
  if (checkout.wycNumber !== me) await requirePrivilege('db')
  if (checkout.timeReturn !== null) throw new Error('This checkout is no longer open for editing')
  return checkout
}

export const getCheckoutForEdit = createServerFn({ method: 'GET' })
  .validator((input) => z.object({ index: checkoutIndexSchema }).parse(input))
  .handler(async ({ data: { index } }) => {
    setResponseHeader('Cache-Control', 'private, no-store')
    const checkout = await requireOpenCheckoutEditor(index)
    try {
      const [crewMembers, guestRows] = await Promise.all([
        getCheckoutCrew(index),
        getCheckoutGuests(index),
      ])
      return {
        skipperWycNumber: checkout.wycNumber,
        crewMembers: crewMembers.map((member) => ({
          wycNumber: member.wycNumber,
          first: str(member.first),
          last: str(member.last),
        })),
        values: toCheckoutEdit(
          checkout,
          crewMembers.map((member) => member.wycNumber),
          guestRows,
        ),
      }
    } catch (error) {
      console.error('Failed to load checkout details for editing:', error)
      throw new Error('Failed to load checkout details')
    }
  })

export const editCheckout = createServerFn({ method: 'POST' })
  .validator((input) =>
    z.object({ index: checkoutIndexSchema, changes: checkoutEditSchema }).parse(input),
  )
  .handler(async ({ data: { index, changes } }) => {
    const checkout = await requireOpenCheckoutEditor(index)
    let validationError: string | null
    try {
      validationError = await updateOpenCheckout(index, checkout.wycNumber, changes)
    } catch (error) {
      console.error('Failed to edit checkout:', error)
      throw new Error('Failed to edit checkout')
    }
    if (validationError) throw new Error(validationError)
    return { success: true }
  })

export const checkInBoat = createServerFn({ method: 'POST' })
  .validator((input) => checkInSchema.parse(input))
  .handler(async ({ data: { index, actualReturn } }) => {
    let row: Awaited<ReturnType<typeof findCheckout>>
    try {
      row = await findCheckout(index)
    } catch (error) {
      console.error('Failed to fetch checkout for check-in:', error)
      throw new Error('Failed to check in boat')
    }
    if (!row) throw new Error('Checkout not found')

    await requireSelfOrPrivilege(row.wycNumber, 'db', 'rtgs')

    const enteredReturn = actualReturn === undefined ? undefined : toDbDateTime(actualReturn)
    if (enteredReturn && enteredReturn < row.timeDeparture) {
      throw new Error('Actual return cannot be before departure')
    }
    if (enteredReturn && enteredReturn > getNowPacificDateTimeString()) {
      throw new Error('Actual return cannot be in the future')
    }

    let updated: boolean
    try {
      const [checkedIn] = await db
        .update(checkouts)
        .set({
          timeReturn: enteredReturn ?? getNowPacificDateTimeString(),
        })
        .where(
          and(
            eq(checkouts.index, index),
            eq(checkouts.wycNumber, row.wycNumber),
            isNull(checkouts.timeReturn),
          ),
        )
        .returning({ index: checkouts.index })
      updated =
        checkedIn !== undefined ||
        enteredReturn === undefined ||
        (await findCheckout(index))?.timeReturn === enteredReturn
    } catch (error) {
      console.error('Failed to check in boat:', error)
      throw new Error('Failed to check in boat')
    }
    if (!updated) throw new Error('This boat has already been checked in')
    return { success: true }
  })
