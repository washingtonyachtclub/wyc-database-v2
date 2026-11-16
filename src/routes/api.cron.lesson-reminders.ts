import { REMINDER_DAYS_AHEAD, sendLessonReminders } from '@/domains/lessons/reminders'
import { createFileRoute } from '@tanstack/react-router'

// Vercel Cron sends CRON_SECRET as a bearer token; a missing secret fails closed.
export const Route = createFileRoute('/api/cron/lesson-reminders')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET
        if (!secret) {
          console.error('Lesson reminders: CRON_SECRET is not set, refusing to run')
          return new Response('Not configured', { status: 500 })
        }
        if (request.headers.get('authorization') !== `Bearer ${secret}`) {
          return new Response('Unauthorized', { status: 401 })
        }

        const params = new URL(request.url).searchParams
        const daysParam = params.get('days')
        const daysAhead = daysParam === null ? REMINDER_DAYS_AHEAD : Number(daysParam)
        if (!Number.isInteger(daysAhead) || daysAhead < 0 || daysAhead > 30) {
          return new Response('days must be an integer between 0 and 30', { status: 400 })
        }

        try {
          const plan = await sendLessonReminders({
            daysAhead,
            dryRun: params.get('dryRun') === '1',
          })
          console.log('Lesson reminders:', {
            targetDate: plan.targetDate,
            lessons: plan.lessons.length,
            sent: plan.sent,
            dryRun: plan.dryRun,
            simulated: plan.simulated,
          })
          return Response.json(plan)
        } catch (error) {
          console.error('Lesson reminders failed:', error)
          return Response.json({ error: 'Failed to send lesson reminders' }, { status: 500 })
        }
      },
    },
  },
})
