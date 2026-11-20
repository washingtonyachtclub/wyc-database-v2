import { dayCounts } from './rental-days'
import { and, count, eq, gt, gte, isNull, lte, sql } from 'drizzle-orm'
import db from '@/db/index'
import { calendarcomment, calendartable } from '@/db/schema'
import { getNowPacificDateTimeString } from '@/lib/date-utils'
import { CalendarRuleError, slotMarker, validateBookingWindow } from './calendar'
import type { ReservationInput, ReservationDetailsInput } from './schema'

type CalendarTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

async function withCalendarLock<T>(run: (tx: CalendarTransaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    // Serialize reservation rules across boats and members, including empty time ranges.
    await tx.execute(sql`LOCK TABLE calendartable, calendarcomment IN SHARE ROW EXCLUSIVE MODE`)
    return run(tx)
  })
}

async function checkReservation(
  locked: CalendarTransaction,
  input: ReservationInput,
  memberId: number,
) {
  const isAdmin = input.kind === 'admin'
  const from = slotMarker(input.fromDate, input.fromSlot)
  const through = slotMarker(input.throughDate, input.throughSlot)
  const now = getNowPacificDateTimeString()
  const [{ total }] = await locked
    .select({ total: count() })
    .from(calendartable)
    .where(
      and(
        isNull(calendartable.deletedAt),
        eq(calendartable.memberWycNumber, memberId),
        eq(calendartable.reservationType, 'personal'),
        gt(calendartable.reserveTo, now),
      ),
    )
  validateBookingWindow(from, through, isAdmin, total, now)
  const [conflict] = await locked
    .select({ id: calendartable.id })
    .from(calendartable)
    .where(
      and(
        isNull(calendartable.deletedAt),
        eq(calendartable.cBoatId, input.boatId),
        lte(calendartable.reserveFrom, through),
        gte(calendartable.reserveTo, from),
      ),
    )
    .limit(1)
  if (conflict)
    throw new CalendarRuleError(
      'This boat is already reserved during those dates. Choose a different boat or change your dates.',
    )
}

export function checkReservationAvailable(input: ReservationInput, memberId: number) {
  return withCalendarLock((locked) => checkReservation(locked, input, memberId))
}

export type ReservationPayment = {
  checkoutId: string
  orderId: string
  paymentId: string
  amountCents: number
  currency: string
  tier: 'student' | 'nonstudent'
  engine: 'outboard' | 'inboard'
}

export function writeReservation(
  input: ReservationInput,
  memberId: number,
  isCalendarAdmin: boolean,
  payment?: ReservationPayment,
) {
  const isAdmin = input.kind === 'admin'
  if (!isAdmin && !payment) throw new CalendarRuleError('Payment is required to reserve a boat.')
  if (isAdmin && !isCalendarAdmin)
    throw new CalendarRuleError('Only calendar managers can make admin reservations.')
  return withCalendarLock(async (locked) => {
    if (payment) {
      const [existing] = await locked
        .select({ id: calendartable.id })
        .from(calendartable)
        .where(eq(calendartable.paymentCheckoutId, payment.checkoutId))
        .limit(1)
      if (existing) return existing
    }
    await checkReservation(locked, input, memberId)
    const from = slotMarker(input.fromDate, input.fromSlot)
    const through = slotMarker(input.throughDate, input.throughSlot)
    const now = getNowPacificDateTimeString()
    const [result] = await locked
      .insert(calendartable)
      .values({
        ...(payment && {
          paymentCheckoutId: payment.checkoutId,
          squareOrderId: payment.orderId,
          squarePaymentId: payment.paymentId,
          paidAmountCents: payment.amountCents,
          paidCurrency: payment.currency,
          pricingTier: payment.tier,
          rentalEngine: payment.engine,
        }),
        cBoatId: input.boatId,
        memberWycNumber: isAdmin ? null : memberId,
        createdByWycNumber: memberId,
        reservationType: input.kind,
        title: isAdmin ? input.title || null : null,
        reserveFrom: from,
        reserveTo: through,
        destination: input.destination,
        numberOfCrew: isAdmin ? 0 : input.numberOfCrew,
        phone: isAdmin ? '' : input.phone,
        comments: null,
        ...dayCounts(from, through),
      })
      .returning({ id: calendartable.id })
    await locked.insert(calendarcomment).values({
      id: result.id,
      userwyc: memberId,
      date: now,
      comment: input.comment || 'Reservation placed',
    })
    return { id: result.id }
  })
}

export function writeComment(id: number, memberId: number, comment: string) {
  return withCalendarLock(async (locked) => {
    const [reservation] = await locked
      .select({ id: calendartable.id })
      .from(calendartable)
      .where(and(eq(calendartable.id, id), isNull(calendartable.deletedAt)))
      .limit(1)
    if (!reservation) throw new CalendarRuleError('Reservation not found.')
    await locked
      .insert(calendarcomment)
      .values({ id, userwyc: memberId, date: getNowPacificDateTimeString(), comment })
    return { success: true }
  })
}

export function removeReservation(id: number, memberId: number) {
  return withCalendarLock(async (locked) => {
    await locked
      .update(calendartable)
      .set({ deletedAt: getNowPacificDateTimeString(), deletedByWycNumber: memberId })
      .where(and(eq(calendartable.id, id), isNull(calendartable.deletedAt)))
    return { success: true }
  })
}

export function updateReservationDetails(
  input: ReservationDetailsInput,
  memberId: number,
  isCalendarAdmin: boolean,
) {
  return withCalendarLock(async (locked) => {
    const [reservation] = await locked
      .select()
      .from(calendartable)
      .where(and(eq(calendartable.id, input.id), isNull(calendartable.deletedAt)))
      .limit(1)
    if (!reservation) throw new CalendarRuleError('Reservation not found.')
    const isAdmin = reservation.reservationType === 'admin'
    const owner = isAdmin ? reservation.createdByWycNumber : reservation.memberWycNumber
    if (!isCalendarAdmin && owner !== memberId)
      throw new CalendarRuleError('You can only edit your own reservations.')
    if (!isAdmin && !input.phone) throw new CalendarRuleError('Enter a contact phone number.')
    await locked
      .update(calendartable)
      .set({
        destination: input.destination,
        title: isAdmin ? input.title || null : reservation.title,
        numberOfCrew: isAdmin ? reservation.numberOfCrew : input.numberOfCrew,
        phone: isAdmin ? reservation.phone : input.phone,
      })
      .where(and(eq(calendartable.id, input.id), isNull(calendartable.deletedAt)))
    await locked.insert(calendarcomment).values({
      id: input.id,
      userwyc: memberId,
      date: getNowPacificDateTimeString(),
      comment: 'Reservation details updated',
    })
    return { id: input.id }
  })
}
