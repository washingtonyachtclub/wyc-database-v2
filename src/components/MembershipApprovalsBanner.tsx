import { membershipApplicationsForApprovalQueryOptions } from '@/domains/membership-applications/query-options'
import { getPendingExemptionsQueryOptions } from '@/domains/renewals/query-options'
import { useCurrentUser } from '@/lib/auth/auth-query-options'
import { hasRoutePrivilegeAccess } from '@/lib/permissions'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Button } from './ui/button'

export function MembershipApprovalsBanner() {
  const { privileges } = useCurrentUser()
  const canReviewMembers = hasRoutePrivilegeAccess(privileges, '/membership-approvals')
  const { data: applications } = useQuery({
    ...membershipApplicationsForApprovalQueryOptions(),
    enabled: canReviewMembers,
  })
  const { data: exemptions } = useQuery({
    ...getPendingExemptionsQueryOptions(),
    enabled: canReviewMembers,
  })

  const applicationCount = applications?.length ?? 0
  const exemptionCount = exemptions?.length ?? 0
  const count = applicationCount + exemptionCount
  if (count === 0) return null
  const category = applicationCount > 0 ? 'new-members' : 'dues-exemptions'

  return (
    <div className="bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <span className="text-sm font-medium">
          {count} open membership approval {count === 1 ? 'item' : 'items'}.
        </span>
        <Button
          asChild
          size="sm"
          variant="secondary"
          className="bg-background text-primary hover:bg-background/90"
        >
          <Link to="/membership-approvals" search={{ category }}>
            Review
          </Link>
        </Button>
      </div>
    </div>
  )
}
