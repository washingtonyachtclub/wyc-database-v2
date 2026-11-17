import { getCalendarAccess } from './queries'
import { z } from 'zod'
import { payForReservation } from './payment'
import { requireAuth } from '@/lib/auth/auth-middleware'
import { reservationSchema } from './schema'
import { CalendarRuleError } from './calendar'
import { calculateRentalSubtotal } from './rental-subtotal'
import { createServerFn } from '@tanstack/react-start'
import { readRentalRates } from './catalog'

export const getRentalRates = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    return await readRentalRates()
  } catch (error) {
    console.error('Unable to load keelboat rates', error)
    throw new Error('Rates are currently unavailable. Please try again later.')
  }
})

export const getRentalSubtotal = createServerFn({ method: 'POST' })
  .validator((input) => reservationSchema.parse(input))
  .handler(async ({ data }) => {
    await requireAuth()
    try {
      if (data.kind !== 'personal')
        throw new CalendarRuleError('Admin reservations do not require payment.')
      const access = await getCalendarAccess()
      return {
        success: true as const,
        data: await calculateRentalSubtotal({ ...data, pricingTier: access.pricingTier }),
      }
    } catch (error) {
      if (error instanceof CalendarRuleError)
        return { success: false as const, message: error.message }
      console.error('Unable to calculate keelboat rental subtotal', error)
      throw new Error('Pricing is currently unavailable. Please try again later.')
    }
  })

export const payRentalReservation = createServerFn({ method: 'POST' })
  .validator((input) =>
    z
      .object({
        attemptId: z.uuid(),
        sourceId: z.string().min(1).max(1024),
        expectedAmountCents: z.number().int().positive(),
        expectedCurrency: z.string().length(3),
        reservation: reservationSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await requireAuth()
    try {
      const access = await getCalendarAccess()
      if (!access.memberId || !access.canBook)
        throw new CalendarRuleError('A keelboat rating is required to reserve a boat.')
      return await payForReservation(
        { ...data, reservation: { ...data.reservation, pricingTier: access.pricingTier } },
        access.memberId,
      )
    } catch (error) {
      if (error instanceof CalendarRuleError)
        return { success: false as const, retryAllowed: true, message: error.message }
      console.error('Unable to complete keelboat payment', { attemptId: data.attemptId, error })
      return {
        success: false as const,
        retryAllowed: false,
        message:
          'We could not confirm whether your payment completed. Do not pay again. Please contact the club.',
      }
    }
  })
