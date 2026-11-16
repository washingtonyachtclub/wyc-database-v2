import { getNowPacificDateTimeString } from '@/lib/date-utils'

export const KEELBOAT_INSTRUCTION_POSITION = 4033
export const SNC_CHAIR_POSITION = 2190
export const BOAT_ORDER = [3, 8, 5, 6, 7]

export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

export function shiftMonth(month: string, offset: number): string {
  const value = new Date(`${month}-01T12:00:00Z`)
  value.setUTCMonth(value.getUTCMonth() + offset)
  return value.toISOString().slice(0, 7)
}

export function monthDays(month: string): string[] {
  const first = `${month}-01`
  const start = addDays(first, -new Date(`${first}T12:00:00Z`).getUTCDay())
  const next = `${shiftMonth(month, 1)}-01`
  const count = Math.ceil((Date.parse(next) - Date.parse(start)) / 86_400_000 / 7) * 7
  return Array.from({ length: count }, (_, i) => addDays(start, i))
}

export function slotMarker(date: string, slot: number): string {
  return `${date} ${slot === 0 ? '03' : '15'}:00:00`
}

export function slotLabel(marker: string): string {
  return `${marker.slice(0, 10)} ${marker.slice(11, 13) < '12' ? 'morning' : 'afternoon'}`
}

export function occupiesSlot(from: string, through: string, date: string, slot: number): boolean {
  const marker = slotMarker(date, slot)
  const fromSlot = slotMarker(from.slice(0, 10), from.slice(11, 13) < '12' ? 0 : 1)
  const throughSlot = slotMarker(through.slice(0, 10), through.slice(11, 13) < '12' ? 0 : 1)
  return marker >= fromSlot && marker <= throughSlot
}

export class CalendarRuleError extends Error {}

export function validateBookingWindow(
  from: string,
  through: string,
  isAdminReservation: boolean,
  outstanding: number,
  now = getNowPacificDateTimeString(),
) {
  const today = now.slice(0, 10)
  const nextYear = new Date(`${today}T12:00:00Z`)
  nextYear.setUTCFullYear(nextYear.getUTCFullYear() + 1)
  const latest = nextYear.toISOString().slice(0, 10)
  if (through < from) throw new CalendarRuleError('Your booking ends before it begins.')
  if (!isAdminReservation && from.slice(0, 10) < today) {
    throw new CalendarRuleError('Your booking starts in the past.')
  }
  if (through.slice(0, 10) > latest) {
    throw new CalendarRuleError('Reservations must end within one year.')
  }
  if (isAdminReservation) return
  if (through.slice(0, 10) >= addDays(from.slice(0, 10), 14)) {
    throw new CalendarRuleError('Maximum 14 days per reservation.')
  }
  if (outstanding >= 3)
    throw new CalendarRuleError('You already have three outstanding reservations.')
  // Identical markers mean one included half-day, not a zero-length reservation.
  if (from === through && `${addDays(from.slice(0, 10), -1)}${from.slice(10)}` > now) {
    throw new CalendarRuleError('Half-days are bookable starting one day before the start time.')
  }
}

export function dayCounts(from: string, through: string) {
  const counts = { numFullWd: 0, numHalfWd: 0, numFullWe: 0, numHalfWe: 0 }
  for (let date = from.slice(0, 10); date <= through.slice(0, 10); date = addDays(date, 1)) {
    const slots =
      Number(occupiesSlot(from, through, date, 0)) + Number(occupiesSlot(from, through, date, 1))
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay()
    const weekend = weekday === 0 || weekday === 6
    if (slots === 2) counts[weekend ? 'numFullWe' : 'numFullWd']++
    else if (slots === 1) counts[weekend ? 'numHalfWe' : 'numHalfWd']++
  }
  return counts
}
