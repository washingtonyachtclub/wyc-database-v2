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

  const messages: string[] = []
  if (health.isLow) {
    messages.push(
      `Only ${health.quartersAhead} quarter${health.quartersAhead === 1 ? '' : 's'} defined ` +
        `ahead of the current one (aim for ${health.target}).`,
    )
  }
  if (health.missingEndDates.length > 0) {
    messages.push(`End date not set for ${health.missingEndDates.join(' and ')}.`)
  }
  if (health.renewalQuarterBehind) {
    messages.push('The renewal quarter constant needs bumping in compute-renewal.ts.')
  }

  if (messages.length === 0) return null

  return (
    <div className="border-b border-amber-300 bg-amber-50 text-amber-900">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <span className="text-sm font-medium">{messages.join(' ')}</span>
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
  )
}
