import { createServerFn } from '@tanstack/react-start'
import { requireAuth } from '@/lib/auth/auth-middleware'
import { CalendarRuleError, monthDays } from './calendar'
import { commentSchema, monthSchema, reservationIdSchema, reservationSchema } from './schema'
import {
  getCalendarAccess,
  readAvailability,
  readBoats,
  readReservation,
  readReservationNames,
} from './queries'
import { removeReservation, writeComment, writeReservation } from './write'

async function calendarOperation<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (error) {
    if (error instanceof CalendarRuleError) throw new Error(error.message)
    console.error('Keelboat calendar operation failed', error)
    throw new Error('Unable to complete the calendar request. Please try again.')
  }
}

async function calendarAction<T>(run: () => Promise<T>) {
  try {
    return { success: true as const, data: await run() }
  } catch (error) {
    if (error instanceof CalendarRuleError) {
      return { success: false as const, message: error.message }
    }
    console.error('Keelboat calendar action failed', error)
    throw new Error('Unable to save your changes. Please try again.')
  }
}

export const getCalendar = createServerFn({ method: 'GET' })
  .validator((input) => monthSchema.parse(input))
  .handler(({ data }) =>
    calendarOperation(async () => {
      const days = monthDays(data)
      const [boats, reservations] = await Promise.all([
        readBoats(),
        readAvailability(days[0], days[days.length - 1]),
      ])
      return { boats, reservations }
    }),
  )

export const getCalendarPermissions = createServerFn({ method: 'GET' }).handler(() =>
  calendarOperation(getCalendarAccess),
)

export const getCalendarNames = createServerFn({ method: 'GET' })
  .validator((input) => monthSchema.parse(input))
  .handler(async ({ data }) => {
    await requireAuth()
    return calendarOperation(() => {
      const days = monthDays(data)
      return readReservationNames(days[0], days[days.length - 1])
    })
  })

export const getReservation = createServerFn({ method: 'GET' })
  .validator((input) => reservationIdSchema.parse(input))
  .handler(async ({ data }) => {
    await requireAuth()
    return calendarOperation(async () => {
      const result = await readReservation(data.id)
      if (!result) throw new CalendarRuleError('Reservation not found.')
      return result
    })
  })

export const createReservation = createServerFn({ method: 'POST' })
  .validator((input) => reservationSchema.parse(input))
  .handler(async ({ data }) => {
    await requireAuth()
    return calendarAction(async () => {
      const access = await getCalendarAccess()
      if (data.kind === 'admin' && !access.canManage)
        throw new CalendarRuleError('Only calendar managers can make admin reservations.')
      if (!access.canBook)
        throw new CalendarRuleError('A keelboat rating is required to reserve a boat.')
      const boats = await readBoats()
      if (!boats.some((boat) => boat.id === data.boatId && boat.active))
        throw new CalendarRuleError('Choose an available boat.')
      return writeReservation(data, access.memberId, access.canManage)
    })
  })

export const addReservationComment = createServerFn({ method: 'POST' })
  .validator((input) => commentSchema.parse(input))
  .handler(async ({ data }) => {
    const memberId = await requireAuth()
    return calendarAction(() => writeComment(data.id, memberId, data.comment))
  })

export const deleteReservation = createServerFn({ method: 'POST' })
  .validator((input) => reservationIdSchema.parse(input))
  .handler(async ({ data }) => {
    await requireAuth()
    return calendarAction(async () => {
      const access = await getCalendarAccess()
      if (!access.canManage)
        throw new CalendarRuleError('You do not have permission to delete reservations.')
      return removeReservation(data.id)
    })
  })
