import { dateOf, timeOf, type LessonSession } from './schema'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAYS_PLURAL = [
  'Sundays',
  'Mondays',
  'Tuesdays',
  'Wednesdays',
  'Thursdays',
  'Fridays',
  'Saturdays',
]

// `new Date('2026-06-13')` is midnight UTC, which lands on the previous day in
// Pacific and reports the wrong weekday.
function parseDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function weekday(date: string): number {
  return parseDate(date).getDay()
}

/** 'Jul 11' */
function formatDate(date: string): string {
  const [, m, d] = date.split('-').map(Number)
  return `${MONTHS[m - 1]} ${d}`
}

/** 'Sat Jul 11' */
function dayDate(date: string): string {
  return `${WEEKDAYS_SHORT[weekday(date)]} ${formatDate(date)}`
}

/** 'Apr 3 – 17', 'Jun 19 – Aug 28' */
function formatDateRange(start: string, end: string): string {
  const [, , endDay] = end.split('-').map(Number)
  const sameMonth = start.slice(0, 7) === end.slice(0, 7)
  return `${formatDate(start)} – ${sameMonth ? endDay : formatDate(end)}`
}

function formatTime(time: string, withMeridiem: boolean): string {
  const [h, m] = time.split(':').map(Number)
  const meridiem = h < 12 ? 'am' : 'pm'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  const minutes = m === 0 ? '' : `:${String(m).padStart(2, '0')}`
  return `${hour12}${minutes}${withMeridiem ? meridiem : ''}`
}

function meridiemOf(time: string): string {
  return Number(time.split(':')[0]) < 12 ? 'am' : 'pm'
}

/** '11am–3pm', '1–4pm' */
function formatTimeRange(startTime: string, endTime: string): string {
  const sameMeridiem = meridiemOf(startTime) === meridiemOf(endTime)
  return `${formatTime(startTime, !sameMeridiem)}–${formatTime(endTime, true)}`
}

function daysBetween(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86_400_000)
}

const startDate = (s: LessonSession) => dateOf(s.startsAt)
const endDate = (s: LessonSession) => dateOf(s.endsAt)
const isSingleDay = (s: LessonSession) => startDate(s) === endDate(s)

// Two same-weekday sessions read better listed out than collapsed into a range.
function isWeeklyRun(sessions: LessonSession[]): boolean {
  if (sessions.length < 3) return false
  const day = weekday(startDate(sessions[0]))
  return sessions.every(
    (s, i) =>
      isSingleDay(s) &&
      !s.allDay &&
      weekday(startDate(s)) === day &&
      (i === 0 || daysBetween(startDate(sessions[i - 1]), startDate(s)) === 7),
  )
}

function sameTimes(sessions: LessonSession[]): boolean {
  return sessions.every(
    (s) =>
      timeOf(s.startsAt) === timeOf(sessions[0].startsAt) &&
      timeOf(s.endsAt) === timeOf(sessions[0].endsAt),
  )
}

/** 'Sat Jul 11, 11am–4pm', 'Fri May 22 – Mon May 25' */
function describeSession(s: LessonSession): string {
  const from = startDate(s)
  const to = endDate(s)

  // No time printed is what says all-day, so saying it again adds nothing. It would
  // also overclaim: on a backfilled row `allDay` only means the prose stated no time,
  // which is not the same as the club saying the thing runs all day.
  if (s.allDay) {
    if (from === to) return dayDate(from)
    // Past a week the weekdays stop narrowing anything down ('Sun – Tue' for 10 days).
    if (daysBetween(from, to) >= 7) return `${formatDate(from)} – ${formatDate(to)}`
    return `${dayDate(from)} – ${dayDate(to)}`
  }

  const start = timeOf(s.startsAt)
  const end = timeOf(s.endsAt)
  if (from === to) return `${dayDate(from)}, ${formatTimeRange(start, end)}`
  return `${dayDate(from)}, ${formatTime(start, true)} – ${dayDate(to)}, ${formatTime(end, true)}`
}

/**
 * One self-contained line per session, so a weekday always sits with its own date.
 * Shared times are repeated rather than factored out: pulling them into a line of
 * their own is what separates 'Sat' from 'Jul 11', and at three sessions or fewer
 * (nearly every lesson) the repetition is cheaper than the special case.
 */
export function formatSessions(sessions: LessonSession[]): string[] {
  if (sessions.length === 0) return []

  const ordered = [...sessions].sort((a, b) => a.startsAt.localeCompare(b.startsAt))

  // The one case where repeating would run to eleven near-identical lines. The time
  // goes on its own line: a collapsed range already carries a weekday and two dates,
  // and appending the hours to that is more than one line can hold.
  if (isWeeklyRun(ordered) && sameTimes(ordered)) {
    const first = startDate(ordered[0])
    const last = startDate(ordered[ordered.length - 1])
    return [
      `${WEEKDAYS_PLURAL[weekday(first)]}, ${formatDateRange(first, last)}`,
      formatTimeRange(timeOf(ordered[0].startsAt), timeOf(ordered[0].endsAt)),
    ]
  }

  return ordered.map(describeSession)
}
