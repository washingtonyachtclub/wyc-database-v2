import { sendLessonReminders, REMINDER_DAYS_AHEAD } from '@/domains/lessons/reminders'
import { sendIncompleteApplicationReminders } from '@/domains/membership-applications/reminders'
import { createFileRoute } from '@tanstack/react-router'
import { pruneAuditLog } from '@/db'
import { withAuditContext } from '@/db/audit-context'

export const Route = createFileRoute('/api/cron/daily-tasks')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET
        if (!secret) {
          console.error('Daily tasks: CRON_SECRET is not set, refusing to run')
          return new Response('Not configured', { status: 500 })
        }
        if (request.headers.get('authorization') !== `Bearer ${secret}`) {
          return new Response('Unauthorized', { status: 401 })
        }

        const url = new URL(request.url)
        const daysParam = url.searchParams.get('lessonDays')
        const daysAhead = daysParam === null ? REMINDER_DAYS_AHEAD : Number(daysParam)
        if (!Number.isInteger(daysAhead) || daysAhead < 0 || daysAhead > 30) {
          return new Response('lessonDays must be an integer between 0 and 30', { status: 400 })
        }
        const dryRun = url.searchParams.get('dryRun') === '1'

        try {
          const [lessonReminders, applicationReminders, auditLog] = await withAuditContext(
            {
              source: 'system',
              action: 'daily-tasks',
              actorWycNumber: null,
              effectiveWycNumber: null,
            },
            () =>
              Promise.all([
                sendLessonReminders({ daysAhead, dryRun }),
                sendIncompleteApplicationReminders({ dryRun }),
                pruneAuditLog(dryRun),
              ]),
          )
          const report = { applicationReminders, auditLog, dryRun, lessonReminders }
          console.log('Daily tasks:', report)
          return Response.json(report)
        } catch (error) {
          console.error('Daily tasks failed:', error)
          return Response.json({ error: 'Failed to run daily tasks' }, { status: 500 })
        }
      },
    },
  },
})
