import { pruneCheckoutDrafts } from '@/domains/membership-applications/checkout-drafts'
import { sendLessonReminders, REMINDER_DAYS_AHEAD } from '@/domains/lessons/reminders'
import { sendIncompleteApplicationReminders } from '@/domains/membership-applications/reminders'

export async function runDailyTasks(daysAhead = REMINDER_DAYS_AHEAD, dryRun = false) {
  const [lessonReminders, applicationReminders, expiredDrafts] = await Promise.all([
    sendLessonReminders({ daysAhead, dryRun }),
    sendIncompleteApplicationReminders({ dryRun }),
    pruneCheckoutDrafts(dryRun),
  ])
  return { applicationReminders, dryRun, expiredDrafts, lessonReminders }
}
