import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useCurrentUser } from '@/lib/auth/auth-query-options'
import { getRenewalStatusQueryOptions } from '@/domains/renewals/query-options'
import { Button } from './ui/button'

export function MembershipBanner() {
  const { isAuthenticated } = useCurrentUser()
  const { data: status } = useQuery({
    ...getRenewalStatusQueryOptions(),
    enabled: isAuthenticated,
  })

  if (!isAuthenticated || !status || status.isActive) return null

  return (
    <div className="bg-destructive text-destructive-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <span className="text-sm font-medium">
          Your membership expired in {status.expireQtrLabel}.
        </span>
        <Button
          asChild
          size="sm"
          variant="secondary"
          className="bg-background text-destructive hover:bg-background/90"
        >
          <Link to="/renew-membership">Renew</Link>
        </Button>
      </div>
    </div>
  )
}
