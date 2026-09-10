const PACIFIC_TIME_ZONE = 'America/Los_Angeles'

const pacificDatePartsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: PACIFIC_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const pacificDisplayDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: PACIFIC_TIME_ZONE,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

const pacificDateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: PACIFIC_TIME_ZONE,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
})

function parseUtcTimestamp(value: Date | string): Date | null {
  const timestamp =
    value instanceof Date
      ? value
      : new Date(
          /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)
            ? `${value.replace(' ', 'T')}Z`
            : value,
        )
  return Number.isNaN(timestamp.getTime()) ? null : timestamp
}

export function toPacificDateString(value: Date | string): string {
  const timestamp = parseUtcTimestamp(value)
  if (!timestamp) return ''

  const parts = Object.fromEntries(
    pacificDatePartsFormatter.formatToParts(timestamp).map(({ type, value: part }) => [type, part]),
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function formatPacificDate(value: Date | string): string {
  const timestamp = parseUtcTimestamp(value)
  return timestamp ? pacificDisplayDateFormatter.format(timestamp) : String(value)
}

export function formatPacificDateTime(value: Date | string): string {
  const timestamp = parseUtcTimestamp(value)
  return timestamp ? pacificDateTimeFormatter.format(timestamp) : String(value)
}

export function getTodayPacificDateString(): string {
  return toPacificDateString(new Date())
}

export function isLessonUpcoming(calendarDate: string): boolean {
  if (!calendarDate) return false
  const todayPacific = getTodayPacificDateString()
  return calendarDate >= todayPacific
}

export function pacificDatePlusDays(days: number): string {
  const d = new Date(`${getTodayPacificDateString()}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// Whole days from today (Pacific) until the given YYYY-MM-DD date. Negative if the date is past.
export function daysUntil(calendarDate: string): number {
  const ms =
    Date.parse(`${calendarDate}T00:00:00Z`) - Date.parse(`${getTodayPacificDateString()}T00:00:00Z`)
  return Math.round(ms / 86_400_000)
}
