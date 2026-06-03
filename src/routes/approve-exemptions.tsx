import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import {
  getPendingExemptionsQueryOptions,
  useApproveExemptionMutation,
  useDenyExemptionMutation,
} from '@/domains/renewals/query-options'
import { getIsExemptionApprover } from '@/domains/renewals/exemption-server-fns'

export const Route = createFileRoute('/approve-exemptions')({
  beforeLoad: async ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
    const { isApprover } = await getIsExemptionApprover()
    if (!isApprover) {
      throw redirect({ to: '/forbidden' })
    }
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(getPendingExemptionsQueryOptions()),
  component: ApproveExemptionsPage,
})

function ApproveExemptionsPage() {
  const { data: requests } = useSuspenseQuery(getPendingExemptionsQueryOptions())
  const approve = useApproveExemptionMutation()
  const deny = useDenyExemptionMutation()
  const [error, setError] = useState<string | null>(null)

  // Disable both buttons on the row currently being decided.
  const busyId = approve.isPending ? approve.variables : deny.isPending ? deny.variables : null

  async function decide(action: 'approve' | 'deny', requestId: number) {
    setError(null)
    try {
      if (action === 'approve') await approve.mutateAsync(requestId)
      else await deny.mutateAsync(requestId)
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dues Exemption Requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Approve grants the requested quarter at no charge; deny closes the request with no change.
        </p>
      </div>

      <ErrorAlert error={error} action="Decide exemption request" />

      {requests.length === 0 ? (
        <div className="rounded-md border bg-muted p-6 text-center text-muted-foreground">
          No pending requests.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div
              key={r.index}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4"
            >
              <div className="space-y-1">
                <div className="font-semibold">
                  {r.name || 'Unknown'}{' '}
                  <span className="text-muted-foreground">#{r.wycNumber}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Requesting <strong className="text-foreground">{r.requestedLabel}</strong> · paid
                  through {r.currentLabel} · requested {new Date(r.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={busyId === r.index}
                  onClick={() => decide('deny', r.index)}
                >
                  Deny
                </Button>
                <Button disabled={busyId === r.index} onClick={() => decide('approve', r.index)}>
                  {busyId === r.index ? 'Working…' : 'Approve'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
