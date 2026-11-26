import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { getCurrentUserQueryOptions } from '@/lib/auth/auth-query-options'
import { getQuarterHealthQueryOptions } from '@/domains/quarters/query-options'
import { hasPrivilege } from '@/lib/permissions'
import { Button } from './ui/button'

export function QuarterMaintenanceBanner() {
  const { data: auth } = useQuery(getCurrentUserQueryOptions())
  const canEdit = hasPrivilege(auth?.privileges ?? [], ['db'])

  // getQuarterHealth requires the db privilege, so only run it once we know the user has it.
  const { data: health } = useQuery({
    ...getQuarterHealthQueryOptions(),
    enabled: canEdit,
  })

  if (!canEdit || !health) return null

  // Quarter data the VC fixes in-app on /quarters.
  const maintenanceMessages: string[] = []
  if (health.isLow) {
    maintenanceMessages.push(
      `Only ${health.quartersAhead} quarter${health.quartersAhead === 1 ? '' : 's'} defined ` +
        `ahead of the current one (aim for ${health.target}).`,
    )
  }
  if (health.missingEndDates.length > 0) {
    maintenanceMessages.push(`End date not set for ${health.missingEndDates.join(' and ')}.`)
  }

  let renewalMessage: string | null = null
  const reminder = health.renewalReminder
  if (reminder?.state === 'stale') {
    renewalMessage = 'The renewal quarter is behind the current quarter.'
  } else if (reminder?.state === 'dueSoon') {
    const timing =
      reminder.days < 0
        ? 'has ended'
        : reminder.days === 0
          ? 'ends today'
          : `ends in ${reminder.days} day${reminder.days === 1 ? '' : 's'}`

    renewalMessage = `${reminder.quarterName} ${timing}. Open renewals for the next quarter.`
  }

  if (!health.currentQuarterOverdue && maintenanceMessages.length === 0 && !renewalMessage) {
    return null
  }

  return (
    <>
      {health.currentQuarterOverdue && (
        <div className="border-b border-destructive/40 bg-destructive text-destructive-foreground">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
            <span className="text-sm font-medium">
              Current quarter is stale: {health.currentQuarterOverdue.quarterName} ended{' '}
              {health.currentQuarterOverdue.endDate}.
            </span>
            <Button asChild size="sm" variant="secondary">
              <Link to="/set-current-quarter">Set current quarter</Link>
            </Button>
          </div>
        </div>
      )}
      {maintenanceMessages.length > 0 && (
        <div className="border-b border-amber-300 bg-amber-50 text-amber-900">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
            <span className="text-sm font-medium">{maintenanceMessages.join(' ')}</span>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-amber-400 bg-background text-amber-900 hover:bg-amber-100"
            >
              <Link to="/quarters">Manage quarters</Link>
            </Button>
          </div>
        </div>
      )}
      {renewalMessage && (
        <div className="border-b border-primary/20 bg-accent text-accent-foreground">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
            <span className="text-sm font-medium">{renewalMessage}</span>
            <Button asChild size="sm" variant="outline">
              <Link to="/set-current-quarter" hash="renewal-quarter">
                Set renewal quarter
              </Link>
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
