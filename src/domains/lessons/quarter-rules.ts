export type QuarterDates = {
  index: number
  school: string
  endDate: string // YYYY-MM-DD, or '' if not set
}

// A lesson's quarter is wrong if that quarter ends before the lesson's calendar
// date. Quarters with no end date on file are skipped, so partial data never
// blocks a valid lesson.
export function quarterMismatchError(
  calendarDate: string,
  expire: number,
  quarters: QuarterDates[],
): string | null {
  if (!calendarDate) return null

  const assigned = quarters.find((q) => q.index === expire)
  if (!assigned || !assigned.endDate) return null
  if (calendarDate <= assigned.endDate) return null

  // Earliest quarter whose end date covers the lesson, for a more helpful message.
  const required = quarters
    .filter((q) => q.endDate)
    .sort((a, b) => a.endDate.localeCompare(b.endDate))
    .find((q) => q.endDate >= calendarDate)
  const target = required ? `${required.school} or later` : 'a later quarter'

  return `This lesson's date (${calendarDate}) is after ${assigned.school} ends (${assigned.endDate}). Set the Expire quarter to ${target}.`
}
