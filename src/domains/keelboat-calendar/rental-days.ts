import Holidays from 'date-holidays'
import { rentalHolidays } from './holidays'
import { addDays, occupiesSlot } from './calendar'

const calendar = new Holidays({ timezone: 'America/Los_Angeles' })
for (const holiday of rentalHolidays) {
  if (!calendar.setHoliday(holiday.rule, { name: holiday.name, type: 'public' })) {
    throw new Error('Invalid rental holiday rule')
  }
}
const datesByYear = new Map<number, Set<string>>()

function holidayDates(year: number) {
  let dates = datesByYear.get(year)
  if (!dates) {
    dates = new Set(calendar.getHolidays(year).map((holiday) => holiday.date.slice(0, 10)))
    datesByYear.set(year, dates)
  }
  return dates
}

export function dayCounts(from: string, through: string) {
  const counts = { numFullWd: 0, numHalfWd: 0, numFullWe: 0, numHalfWe: 0 }
  for (let date = from.slice(0, 10); date <= through.slice(0, 10); date = addDays(date, 1)) {
    const slots =
      Number(occupiesSlot(from, through, date, 0)) + Number(occupiesSlot(from, through, date, 1))
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay()
    const weekend =
      weekday === 0 || weekday === 6 || holidayDates(Number(date.slice(0, 4))).has(date)
    if (slots === 2) counts[weekend ? 'numFullWe' : 'numFullWd']++
    else if (slots === 1) counts[weekend ? 'numHalfWe' : 'numHalfWd']++
  }
  return counts
}
