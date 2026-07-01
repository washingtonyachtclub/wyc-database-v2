export function getTodayPacificDateString(): string {
  const now = new Date()

  // Get date parts in America/Los_Angeles and convert to YYYY-MM-DD
  const pacificString = now.toLocaleDateString('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  // en-CA returns YYYY-MM-DD
  return pacificString
}

// Strips the time portion from a datetime string, leaving YYYY-MM-DD.
export function dateOnly(value: string): string {
  return value ? value.slice(0, 10) : ''
}

export function isLessonUpcoming(calendarDate: string): boolean {
  if (!calendarDate) return false
  const todayPacific = getTodayPacificDateString()
  return calendarDate >= todayPacific
}

// Whole days from today (Pacific) until the given YYYY-MM-DD date. Negative if the date is past.
export function daysUntil(calendarDate: string): number {
  const ms =
    Date.parse(`${calendarDate}T00:00:00Z`) - Date.parse(`${getTodayPacificDateString()}T00:00:00Z`)
  return Math.round(ms / 86_400_000)
}
