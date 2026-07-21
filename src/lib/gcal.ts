import { GoogleAuth } from 'google-auth-library'

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? ''
const SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? ''
const TIMEZONE = 'America/Los_Angeles'
const API_BASE = 'https://www.googleapis.com/calendar/v3/calendars'

export function gcalEnabled(): boolean {
  return CALENDAR_ID !== '' && SERVICE_ACCOUNT_JSON !== ''
}

// Google event ids are base32hex: lowercase a-v and 0-9 only, min length 5. Keyed off
// the session's stable PK, so no stored column and edits keep their event.
export function sessionEventId(sessionIndex: number): string {
  return `lsession${sessionIndex}`
}

export type CalendarSession = {
  index: number
  startsAt: string // 'YYYY-MM-DD HH:MM:SS', club local
  endsAt: string // inclusive
  allDay: boolean
}

export type CalendarLesson = {
  title: string
  location: string
  colorId?: string // Google's fixed palette; unset = calendar default
}

let auth: GoogleAuth | undefined
function getAuth(): GoogleAuth {
  auth ??= new GoogleAuth({
    credentials: JSON.parse(SERVICE_ACCOUNT_JSON),
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })
  return auth
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function gcalFetch(path: string, init: RequestInit): Promise<Response> {
  const token = await getAuth().getAccessToken()
  const url = `${API_BASE}/${encodeURIComponent(CALENDAR_ID)}/events${path}`
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...init.headers,
  }
  // Calendar's short-term quota rejects bursts (a resync touches many events at once).
  // Only rate-limit 403s retry; a permission 403 is terminal.
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { ...init, headers })
    if (attempt >= 5 || (res.status !== 429 && res.status !== 403)) return res
    if (res.status === 403 && !/rateLimitExceeded/.test(await res.clone().text())) return res
    await sleep(2 ** attempt * 500 + Math.random() * 250)
  }
}

// Google's all-day end date is exclusive; lesson_sessions.endsAt is inclusive.
function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function eventBody(lesson: CalendarLesson, session: CalendarSession) {
  const timePoint = session.allDay
    ? {
        start: { date: session.startsAt.slice(0, 10) },
        end: { date: nextDay(session.endsAt.slice(0, 10)) },
      }
    : {
        start: { dateTime: session.startsAt.replace(' ', 'T'), timeZone: TIMEZONE },
        end: { dateTime: session.endsAt.replace(' ', 'T'), timeZone: TIMEZONE },
      }
  return {
    id: sessionEventId(session.index),
    summary: lesson.title,
    location: lesson.location,
    // Omit on non-work-parties so a PUT resets any prior color to the calendar default.
    ...(lesson.colorId ? { colorId: lesson.colorId } : {}),
    ...timePoint,
  }
}

export async function upsertSessionEvent(
  lesson: CalendarLesson,
  session: CalendarSession,
): Promise<void> {
  if (!gcalEnabled()) return
  const body = JSON.stringify(eventBody(lesson, session))
  const id = sessionEventId(session.index)

  const res = await gcalFetch(`/${id}`, { method: 'PUT', body })
  if (res.ok) return
  if (res.status === 404 || res.status === 410) {
    const created = await gcalFetch('', { method: 'POST', body })
    if (!created.ok) throw new Error(`gcal insert ${created.status}: ${await created.text()}`)
    return
  }
  throw new Error(`gcal update ${res.status}: ${await res.text()}`)
}

export async function deleteSessionEvent(sessionIndex: number): Promise<void> {
  if (!gcalEnabled()) return
  const res = await gcalFetch(`/${sessionEventId(sessionIndex)}`, { method: 'DELETE' })
  // Already gone is the desired end state.
  if (res.ok || res.status === 404 || res.status === 410) return
  throw new Error(`gcal delete ${res.status}: ${await res.text()}`)
}
