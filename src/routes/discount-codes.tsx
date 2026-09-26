import { PromotionFormModal } from '@/components/membership-promotions/PromotionFormModal'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import {
  membershipPromotionsQueryOptions,
  useSetMembershipPromotionActiveMutation,
} from '@/domains/membership-promotions/query-options'
import type { listMembershipPromotions } from '@/domains/membership-promotions/server-fns'
import { requirePrivilegeForRoute } from '@/lib/route-guards'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Pencil, Plus } from 'lucide-react'
import { useState } from 'react'

type MembershipPromotion = Awaited<ReturnType<typeof listMembershipPromotions>>[number]

export const Route = createFileRoute('/discount-codes')({
  beforeLoad: ({ context }) => requirePrivilegeForRoute(context, '/discount-codes'),
  loader: ({ context }) => context.queryClient.ensureQueryData(membershipPromotionsQueryOptions()),
  component: MembershipPromotionsPage,
})

function formatDiscount(promotion: MembershipPromotion) {
  return promotion.percentageOff !== null
    ? `${promotion.percentageOff}% off`
    : `$${((promotion.amountOffCents ?? 0) / 100).toFixed(2)} off`
}

function formatAudience(audience: string) {
  if (audience === 'new_members') return 'New members'
  if (audience === 'renewals') return 'Renewals'
  return 'New members and renewals'
}

function MembershipPromotionsPage() {
  const { data: promotions } = useSuspenseQuery(membershipPromotionsQueryOptions())
  const statusMutation = useSetMembershipPromotionActiveMutation()
  const [editing, setEditing] = useState<MembershipPromotion | null | 'new'>(null)

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discount Codes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage codes for new memberships and renewals.
          </p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" />
          New Discount Code
        </Button>
      </div>

      <ErrorAlert error={statusMutation.error?.message} action="Update discount code" />

      {promotions.length === 0 ? (
        <div className="rounded-lg border bg-muted p-8 text-center text-muted-foreground">
          No discount codes.
        </div>
      ) : (
        <div className="space-y-3">
          {promotions.map((promotion) => (
            <div
              key={promotion.index}
              className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{promotion.name}</h2>
                  <span className="rounded border bg-muted px-2 py-0.5 font-mono text-sm">
                    {promotion.code}
                  </span>
                  {!promotion.active && (
                    <span className="rounded border px-2 py-0.5 text-xs text-muted-foreground">
                      Disabled
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDiscount(promotion)} · {formatAudience(promotion.audience)} ·{' '}
                  {promotion.startsOn} through {promotion.endsOn}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {promotion.redemptionCount}
                  {promotion.maxRedemptions === null
                    ? ' redemptions'
                    : ` of ${promotion.maxRedemptions} redemptions`}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button type="button" variant="outline" onClick={() => setEditing(promotion)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={statusMutation.isPending}
                  onClick={() =>
                    statusMutation.mutate({ index: promotion.index, active: !promotion.active })
                  }
                >
                  {promotion.active ? 'Disable' : 'Enable'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <PromotionFormModal
          promotion={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
