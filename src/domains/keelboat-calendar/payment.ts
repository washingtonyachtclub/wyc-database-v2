import { eq } from 'drizzle-orm'
import db from '@/db/index'
import { keelboatPayments } from '@/db/schema'
import { SQUARE_LOCATION_ID, squareClient } from '@/lib/square'
import { chargeSquareOrder, SquarePaymentError } from '@/lib/square-payment'
import { CalendarRuleError } from './calendar'
import { calculateRentalSubtotal } from './rental-subtotal'
import { checkReservationAvailable, writeReservation } from './write'
import type { ReservationInput } from './schema'

const uncertainMessage =
  'We could not confirm whether your payment completed. Do not pay again. Please contact the club.'
const recordingMessage =
  'Your payment went through, but we could not finish recording your reservation. Do not pay again. Please contact the club.'

type PaymentResult =
  | { success: true; id: number }
  | { success: false; message: string; retryAllowed: boolean; refreshPrice?: boolean }

async function readPayment(id: string) {
  const [payment] = await db
    .select()
    .from(keelboatPayments)
    .where(eq(keelboatPayments.id, id))
    .limit(1)
  return payment
}

function existingPaymentResult(
  payment: typeof keelboatPayments.$inferSelect,
  memberId: number,
): PaymentResult {
  if (payment.memberId !== memberId)
    throw new CalendarRuleError('Unable to process this payment attempt.')
  if (payment.status === 'completed' && payment.reservationId)
    return { success: true, id: payment.reservationId }
  if (payment.status === 'failed')
    return {
      success: false,
      retryAllowed: true,
      message: 'This payment attempt failed. Please try again.',
    }
  return { success: false, retryAllowed: false, message: uncertainMessage }
}

async function updatePayment(id: string, values: Partial<typeof keelboatPayments.$inferInsert>) {
  await db.update(keelboatPayments).set(values).where(eq(keelboatPayments.id, id))
}

export async function payForReservation(
  input: {
    attemptId: string
    sourceId: string
    expectedAmountCents: number
    expectedCurrency: string
    reservation: ReservationInput
  },
  memberId: number,
): Promise<PaymentResult> {
  if (input.reservation.kind !== 'personal')
    throw new CalendarRuleError('Admin reservations do not require payment.')
  const existing = await readPayment(input.attemptId)
  if (existing) return existingPaymentResult(existing, memberId)
  await checkReservationAvailable(input.reservation, memberId)
  const subtotal = await calculateRentalSubtotal(input.reservation)
  if (
    subtotal.amountCents !== input.expectedAmountCents ||
    subtotal.currency !== input.expectedCurrency
  ) {
    return {
      success: false,
      retryAllowed: true,
      refreshPrice: true,
      message: 'Rates have changed. Review the updated total before paying.',
    }
  }
  if (!SQUARE_LOCATION_ID) throw new Error('Square location is not configured')
  try {
    await db.insert(keelboatPayments).values({
      id: input.attemptId,
      memberId,
      activeMemberId: memberId,
      reservationInput: input.reservation,
      priceSnapshot: subtotal,
      amountCents: subtotal.amountCents,
      currency: subtotal.currency,
      status: 'processing',
    })
  } catch (error) {
    const existing = await readPayment(input.attemptId)
    if (existing) return existingPaymentResult(existing, memberId)
    const [active] = await db
      .select({ id: keelboatPayments.id })
      .from(keelboatPayments)
      .where(eq(keelboatPayments.activeMemberId, memberId))
      .limit(1)
    if (active) return { success: false, retryAllowed: false, message: uncertainMessage }
    throw error
  }

  let orderId: string
  try {
    const response = await squareClient.orders.create({
      idempotencyKey: `kb-o/${input.attemptId}`,
      order: {
        locationId: SQUARE_LOCATION_ID,
        referenceId: input.attemptId,
        pricingOptions: { autoApplyTaxes: false, autoApplyDiscounts: false },
        lineItems: subtotal.lines.map((line) => ({
          catalogObjectId: line.variationId,
          quantity: String(line.quantity),
          basePriceMoney: { amount: BigInt(line.unitCents), currency: subtotal.currency as 'USD' },
        })),
      },
    })
    const order = response.order
    if (
      !order?.id ||
      order.totalMoney?.amount !== BigInt(subtotal.amountCents) ||
      order.totalMoney.currency !== subtotal.currency ||
      (order.totalTaxMoney?.amount ?? 0n) !== 0n
    ) {
      throw new Error('Square rental order total did not match the reviewed price')
    }
    orderId = order.id
    await updatePayment(input.attemptId, { squareOrderId: orderId })
  } catch (error) {
    console.error('Failed to create keelboat rental order', { attemptId: input.attemptId, error })
    await updatePayment(input.attemptId, { status: 'failed', activeMemberId: null })
    return {
      success: false,
      retryAllowed: true,
      message: 'We could not start your payment. Please try again.',
    }
  }

  let paymentId: string
  try {
    const payment = await chargeSquareOrder({
      idempotencyKey: `kb-p/${input.attemptId}`,
      order: { orderId, amountCents: subtotal.amountCents, currency: subtotal.currency },
      sourceId: input.sourceId,
    })
    paymentId = payment.id!
  } catch (error) {
    console.error('Keelboat rental payment failed', { attemptId: input.attemptId, orderId, error })
    const definiteFailure = error instanceof SquarePaymentError && error.kind !== 'unknown'
    await updatePayment(input.attemptId, {
      status: definiteFailure ? 'failed' : 'reconciliation_required',
      ...(definiteFailure && { activeMemberId: null }),
    })
    return {
      success: false,
      retryAllowed: definiteFailure,
      message: definiteFailure ? (error as SquarePaymentError).message : uncertainMessage,
    }
  }

  try {
    await updatePayment(input.attemptId, { status: 'paid', squarePaymentId: paymentId })
    const reservation = await writeReservation(input.reservation, memberId, false, {
      checkoutId: input.attemptId,
      orderId,
      paymentId,
      amountCents: subtotal.amountCents,
      currency: subtotal.currency,
      tier: subtotal.tier,
      engine: subtotal.engine,
    })
    await updatePayment(input.attemptId, {
      status: 'completed',
      reservationId: reservation.id,
      activeMemberId: null,
    })
    return { success: true, id: reservation.id }
  } catch (error) {
    console.error('Keelboat payment completed but reservation recording failed', {
      attemptId: input.attemptId,
      orderId,
      paymentId,
      error,
    })
    await updatePayment(input.attemptId, {
      status: 'reconciliation_required',
      squarePaymentId: paymentId,
    }).catch((error) => {
      console.error('Failed to mark keelboat payment for reconciliation', {
        attemptId: input.attemptId,
        error,
      })
    })
    return { success: false, retryAllowed: false, message: recordingMessage }
  }
}
