import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useCurrentUser } from '@/lib/auth/auth-query-options'
import {
  getIsExemptionApproverQueryOptions,
  getPendingExemptionsQueryOptions,
} from '@/domains/renewals/query-options'
import { Button } from './ui/button'

export function ExemptionApproverBanner() {
  const { user } = useCurrentUser()
  // Approver status is the single gate: the same query the approval route and sidebar use.
  const { data: approver } = useQuery({
    ...getIsExemptionApproverQueryOptions(),
    enabled: Boolean(user),
  })
  const isApprover = approver?.isApprover ?? false

  // listPendingExemptionRequests enforces approver server-side, so only run it once gated.
  const { data: pending } = useQuery({
    ...getPendingExemptionsQueryOptions(),
    enabled: isApprover,
  })

  const count = pending?.length ?? 0
  if (!isApprover || count === 0) return null

  return (
    <div className="bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <span className="text-sm font-medium">
          {count} pending dues exemption {count === 1 ? 'request' : 'requests'} awaiting review.
        </span>
        <Button
          asChild
          size="sm"
          variant="secondary"
          className="bg-background text-primary hover:bg-background/90"
        >
          <Link to="/approve-exemptions">Review</Link>
        </Button>
      </div>
    </div>
  )
}
