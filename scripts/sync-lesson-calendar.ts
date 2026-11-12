import { lessonIdsEndingOnOrAfter } from '../src/domains/lessons/queries'
import { readFile, writeFile } from 'node:fs/promises'
import { and, count, eq, inArray } from 'drizzle-orm'
import db from '../src/db/index'
import { lessons, signups } from '../src/db/schema'
import { calendarLessonIds, lessonCalendarEntries } from '../src/domains/lessons/calendar'
import { CALENDAR_SYNC_START_DATE } from '../src/domains/lessons/visibility'
import { getTodayPacificDateString } from '../src/lib/date-utils'
import { gcalEnabled, upsertSessionEvent } from '../src/lib/gcal'

async function preview() {
  const entries = []
  for (const id of await calendarLessonIds()) entries.push(...(await lessonCalendarEntries(id)))
  const today = getTodayPacificDateString()
  const hiddenUpcoming = await db
    .select({ lessonId: lessons.index, title: lessons.subtype })
    .from(lessons)
    .where(and(eq(lessons.display, 0), inArray(lessons.index, lessonIdsEndingOnOrAfter(today))))
    .orderBy(lessons.index)
  const enrollmentCounts = await db
    .select({ lessonId: signups.class, count: count() })
    .from(signups)
    .groupBy(signups.class)
  const counts = new Map(enrollmentCounts.map((row) => [row.lessonId, row.count]))
  return {
    calendarId: process.env.GOOGLE_CALENDAR_ID ?? '',
    since: CALENDAR_SYNC_START_DATE,
    generatedAt: new Date().toISOString(),
    hiddenUpcoming,
    entries: entries.map((entry) => ({
      ...entry,
      enrollmentCount: counts.get(entry.lessonId) ?? 0,
    })),
  }
}

async function main() {
  const [mode, file, ...extra] = process.argv.slice(2)
  if (!['--preview', '--apply'].includes(mode) || !file || extra.length) {
    throw new Error('Usage: npm run calendar:sync -- --preview FILE.json | --apply FILE.json')
  }
  const current = await preview()
  if (!current.calendarId)
    throw new Error('GOOGLE_CALENDAR_ID is required to identify the target calendar')
  if (mode === '--preview') {
    await writeFile(file, `${JSON.stringify(current, null, 2)}\n`, { flag: 'wx' })
    console.log(
      `Preview: ${current.entries.length} sessions since ${current.since}; ${current.hiddenUpcoming.length} hidden upcoming lessons to review. Saved to ${file}.`,
    )
    return
  }

  const reviewed = JSON.parse(await readFile(file, 'utf8')) as Awaited<ReturnType<typeof preview>>
  const contents = (plan: typeof current) =>
    JSON.stringify({
      calendarId: plan.calendarId,
      since: plan.since,
      entries: plan.entries.map(({ enrollmentCount: _count, ...entry }) => entry),
    })
  if (contents(reviewed) !== contents(current)) {
    throw new Error(
      'Calendar target or lesson data differs from the reviewed preview. Generate and review a new preview.',
    )
  }
  if (!gcalEnabled()) throw new Error('Calendar sync credentials are not configured')
  let failed = 0
  for (const { lessonId, details, session } of current.entries) {
    try {
      await upsertSessionEvent(details, session)
      console.log(`Synced lesson ${lessonId}, session ${session.index}`)
    } catch (error) {
      failed++
      console.error(`Failed lesson ${lessonId}, session ${session.index}:`, error)
    }
  }
  console.log(`Synced ${current.entries.length - failed}; failed ${failed}.`)
  if (failed > 0) process.exitCode = 1
}

try {
  await main()
} catch (error) {
  console.error(error)
  process.exitCode = 1
} finally {
  await db.$client.promise().end()
}
