import { DiscountCodeFormModal } from '@/components/membership-discount-codes/DiscountCodeFormModal'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import {
  membershipDiscountCodesQueryOptions,
  useSetMembershipDiscountCodeActiveMutation,
} from '@/domains/membership-discount-codes/query-options'
import type { listMembershipDiscountCodes } from '@/domains/membership-discount-codes/server-fns'
import { getTodayPacificDateString } from '@/lib/date-utils'
import { requirePrivilegeForRoute } from '@/lib/route-guards'
import { cn } from '@/lib/utils'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Pencil, Plus } from 'lucide-react'
import { useState } from 'react'

type MembershipDiscountCode = Awaited<ReturnType<typeof listMembershipDiscountCodes>>[number]
type DiscountCodeStatus = {
  label: string
  section: 'active' | 'scheduled' | 'inactive'
  toggleable: boolean
}

export const Route = createFileRoute('/discount-codes')({
  beforeLoad: ({ context }) => requirePrivilegeForRoute(context, '/discount-codes'),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(membershipDiscountCodesQueryOptions()),
  component: MembershipDiscountCodesPage,
})

function formatDiscount(discountCode: MembershipDiscountCode) {
  return discountCode.percentageOff !== null
    ? `${discountCode.percentageOff}% off`
    : `$${((discountCode.amountOffCents ?? 0) / 100).toFixed(2)} off`
}

function formatAudience(audience: string) {
  if (audience === 'new_members') return 'New members'
  if (audience === 'renewals') return 'Renewals'
  return 'New members and renewals'
}

function getDiscountCodeStatus(
  discountCode: MembershipDiscountCode,
  today: string,
): DiscountCodeStatus {
  if (discountCode.endsOn < today) {
    return { label: 'Expired', section: 'inactive', toggleable: false }
  }
  if (
    discountCode.maxRedemptions !== null &&
    discountCode.redemptionCount >= discountCode.maxRedemptions
  ) {
    return { label: 'Redemption limit reached', section: 'inactive', toggleable: false }
  }
  if (!discountCode.active) {
    return { label: 'Disabled', section: 'inactive', toggleable: true }
  }
  if (discountCode.startsOn > today) {
    return { label: 'Scheduled', section: 'scheduled', toggleable: true }
  }
  return { label: 'Active', section: 'active', toggleable: true }
}

function DiscountCodeCard({
  discountCode,
  onEdit,
}: {
  discountCode: MembershipDiscountCode
  onEdit: () => void
}) {
  const statusMutation = useSetMembershipDiscountCodeActiveMutation()
  const status = getDiscountCodeStatus(discountCode, getTodayPacificDateString())

  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between',
        status.section === 'inactive' && 'bg-muted/40 opacity-50',
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{discountCode.name}</h3>
          <span className="rounded border bg-background px-2 py-0.5 font-mono text-sm">
            {discountCode.code}
          </span>
        </div>
        {status.section === 'inactive' && (
          <p className="mt-1 text-sm font-medium">{status.label}</p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          {formatDiscount(discountCode)} · {formatAudience(discountCode.audience)} ·{' '}
          {discountCode.startsOn} through {discountCode.endsOn}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {discountCode.redemptionCount}
          {discountCode.maxRedemptions === null
            ? ' redemptions'
            : ` of ${discountCode.maxRedemptions} redemptions`}
        </p>
        <ErrorAlert error={statusMutation.error?.message} action="Update discount code" />
      </div>
      <div className="flex shrink-0 gap-2">
        <Button type="button" variant="outline" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
        {status.toggleable && (
          <Button
            type="button"
            variant="outline"
            disabled={statusMutation.isPending}
            onClick={() =>
              statusMutation.mutate({ index: discountCode.index, active: !discountCode.active })
            }
          >
            {discountCode.active ? 'Disable' : 'Enable'}
          </Button>
        )}
      </div>
    </div>
  )
}

function DiscountCodeSection({
  discountCodes,
  name,
  onEdit,
}: {
  discountCodes: MembershipDiscountCode[]
  name: string
  onEdit: (discountCode: MembershipDiscountCode) => void
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{name}</h2>
      {discountCodes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No {name.toLowerCase()} discount codes.</p>
      ) : (
        discountCodes.map((discountCode) => (
          <DiscountCodeCard
            key={discountCode.index}
            discountCode={discountCode}
            onEdit={() => onEdit(discountCode)}
          />
        ))
      )}
    </section>
  )
}

function MembershipDiscountCodesPage() {
  const { data: discountCodes } = useSuspenseQuery(membershipDiscountCodesQueryOptions())
  const [editing, setEditing] = useState<MembershipDiscountCode | null | 'new'>(null)
  const today = getTodayPacificDateString()
  const activeDiscountCodes = discountCodes.filter(
    (discountCode) => getDiscountCodeStatus(discountCode, today).section === 'active',
  )
  const scheduledDiscountCodes = discountCodes.filter(
    (discountCode) => getDiscountCodeStatus(discountCode, today).section === 'scheduled',
  )
  const inactiveDiscountCodes = discountCodes.filter(
    (discountCode) => getDiscountCodeStatus(discountCode, today).section === 'inactive',
  )

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

      {discountCodes.length === 0 ? (
        <div className="rounded-lg border bg-muted p-8 text-center text-muted-foreground">
          No discount codes.
        </div>
      ) : (
        <div className="space-y-8">
          <DiscountCodeSection
            name="Active"
            discountCodes={activeDiscountCodes}
            onEdit={setEditing}
          />
          <DiscountCodeSection
            name="Scheduled"
            discountCodes={scheduledDiscountCodes}
            onEdit={setEditing}
          />
          <DiscountCodeSection
            name="Inactive"
            discountCodes={inactiveDiscountCodes}
            onEdit={setEditing}
          />
        </div>
      )}

      {editing && (
        <DiscountCodeFormModal
          discountCode={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
