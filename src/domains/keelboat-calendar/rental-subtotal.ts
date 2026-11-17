import { dayCounts } from './rental-days'
import { slotMarker, CalendarRuleError, validateBookingWindow } from './calendar'
import { readRentalRates } from './catalog'
import { readBoats } from './queries'
import type { ReservationInput } from './schema'
import { pricingTierLabels, type RentalRateKey, type RentalSubtotal } from './pricing'

export async function calculateRentalSubtotal(input: ReservationInput): Promise<RentalSubtotal> {
  const boat = (await readBoats()).find((boat) => boat.id === input.boatId && boat.active)
  const engine = boat?.engineType === 'both' ? input.rentalEngine : boat?.engineType
  if (engine !== 'inboard' && engine !== 'outboard') {
    throw new CalendarRuleError('Choose an engine for this reservation.')
  }
  const from = slotMarker(input.fromDate, input.fromSlot)
  const through = slotMarker(input.throughDate, input.throughSlot)
  validateBookingWindow(from, through, false, 0)
  const counts = dayCounts(from, through)
  const rates = await readRentalRates()
  const groups = [
    { quantity: counts.numFullWd, day: 'weekday', duration: 'full' },
    { quantity: counts.numHalfWd, day: 'weekday', duration: 'half' },
    { quantity: counts.numFullWe, day: 'weekend', duration: 'full' },
    { quantity: counts.numHalfWe, day: 'weekend', duration: 'half' },
  ] as const
  const lines = groups
    .filter((group) => group.quantity > 0)
    .map((group) => {
      const key: RentalRateKey = `${input.pricingTier}:${engine}:${group.day}:${group.duration}`
      const rate = rates.find((rate) => rate.key === key)
      if (!rate) throw new Error('Rental rate is missing')
      return {
        key,
        label: `${pricingTierLabels[input.pricingTier]} · ${group.day === 'weekend' ? 'weekend/holiday' : 'weekday'} ${group.duration} day`,
        quantity: group.quantity,
        unitCents: rate.amountCents,
        amountCents: rate.amountCents * group.quantity,
        variationId: rate.variationId,
      }
    })
  const currency = rates[0].currency
  if (rates.some((rate) => rate.currency !== currency))
    throw new Error('Rental currencies do not match')
  return {
    engine,
    tier: input.pricingTier,
    lines,
    currency,
    amountCents: lines.reduce((total, line) => total + line.amountCents, 0),
  }
}
