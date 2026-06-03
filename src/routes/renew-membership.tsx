import type { SquareCardHandle } from '@/components/renewals/SquareCardForm'
import { SquareCardForm } from '@/components/renewals/SquareCardForm'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmailSimulatedNotice } from '@/components/ui/EmailSimulatedNotice'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { RenewalDuration, RenewalTier } from '@/domains/renewals/compute-renewal'
import {
  getRenewalPriceQueryOptions,
  getRenewalStatusQueryOptions,
  usePayAndRenewMutation,
  useRequestDuesExemptionMutation,
} from '@/domains/renewals/query-options'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { CircleHelp } from 'lucide-react'
import { useRef, useState } from 'react'

export const Route = createFileRoute('/renew-membership')({
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(getRenewalStatusQueryOptions()),
  component: RenewMembershipPage,
})

function formatMoney(cents: number, currency: string) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency })
}

type RenewResult = {
  newExpireQtr: number
  quarterLabel: string
  amountCents: number
  currency: string
  emailSent: boolean
  emailSimulated: boolean
}

function RenewMembershipPage() {
  const { data: status } = useSuspenseQuery(getRenewalStatusQueryOptions())

  // Quarterly is the smallest jump, so if it's over the cap nothing can be renewed right now.
  const canRenew = status.preview.quarterly.allowed

  const [tier, setTier] = useState<RenewalTier | null>(null)
  const [duration, setDuration] = useState<RenewalDuration>(
    status.preview.annual.allowed ? 'annual' : 'quarterly',
  )
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<RenewResult | null>(null)

  const cardRef = useRef<SquareCardHandle>(null)
  const mutation = usePayAndRenewMutation()

  const priceQuarterly = useQuery({
    ...getRenewalPriceQueryOptions(tier ?? 'student', 'quarterly'),
    enabled: tier !== null,
  })
  const priceAnnual = useQuery({
    ...getRenewalPriceQueryOptions(tier ?? 'student', 'annual'),
    enabled: tier !== null,
  })
  const selectedPrice = duration === 'annual' ? priceAnnual : priceQuarterly

  function priceLabel(query: typeof priceQuarterly) {
    if (tier === null) return '—'
    if (query.isLoading) return '…'
    return query.data ? formatMoney(query.data.amountCents, query.data.currency) : 'Unavailable'
  }

  async function handlePay() {
    if (!tier) return
    setError(null)
    setSubmitting(true)
    try {
      const sourceId = await cardRef.current!.tokenize()
      const data = await mutation.mutateAsync({ tier, duration, sourceId })
      setResult(data)
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <div className="p-4 max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Membership Renewed</h1>
        <div className="rounded-md border border-green-300 bg-green-50 p-4 text-green-800">
          <p className="font-semibold">
            Thank you — your payment of {formatMoney(result.amountCents, result.currency)} was
            received.
          </p>
          <p className="mt-1">
            Your membership is now active through <strong>{result.quarterLabel}</strong>.
          </p>
        </div>
        {result.emailSent && (
          <p className="text-sm text-muted-foreground">A confirmation email is on its way.</p>
        )}
        {result.emailSimulated && <EmailSimulatedNotice />}
      </div>
    )
  }

  if (!canRenew) {
    return (
      <div className="p-4 max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Renew Membership</h1>
        <p>
          Your membership is paid through <strong>{status.expireQtrLabel}</strong>.
        </p>
        <div className="rounded-md border bg-muted p-4">
          <p>
            You're already paid as far ahead as we allow. You can renew again closer to your expiry
            date.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-md space-y-6">
      <h1 className="text-2xl font-bold">Renew Membership</h1>

      <p>
        Your membership is paid through <strong>{status.expireQtrLabel}</strong>.
      </p>

      <div className="space-y-2">
        <Label className="text-base">Rate</Label>
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant={tier === 'student' ? 'default' : 'outline'}
            onClick={() => setTier('student')}
            className="h-auto border-2 py-3 text-base"
          >
            Student
          </Button>
          <Button
            type="button"
            variant={tier === 'nonstudent' ? 'default' : 'outline'}
            onClick={() => setTier('nonstudent')}
            className="h-auto border-2 py-3 text-base"
          >
            Non-student
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-base">Duration</Label>
        {tier === null && (
          <p className="text-base font-medium text-muted-foreground">
            Choose your rate above to see pricing.
          </p>
        )}
        <div
          className={`grid gap-3 ${status.preview.annual.allowed ? 'grid-cols-2' : 'grid-cols-1'}`}
        >
          <Button
            type="button"
            variant={duration === 'quarterly' ? 'default' : 'outline'}
            onClick={() => setDuration('quarterly')}
            disabled={tier === null}
            className="h-auto flex-col items-stretch gap-0 whitespace-normal border-2 px-4 py-3 text-left"
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-base font-semibold">Quarterly</span>
              <span className="text-base font-semibold">{priceLabel(priceQuarterly)}</span>
            </span>
            <span className="my-2 h-px w-full bg-current opacity-25" />
            <span className="text-base font-normal">{status.preview.quarterly.label}</span>
          </Button>
          {status.preview.annual.allowed && (
            <Button
              type="button"
              variant={duration === 'annual' ? 'default' : 'outline'}
              onClick={() => setDuration('annual')}
              disabled={tier === null}
              className="h-auto flex-col items-stretch gap-0 whitespace-normal border-2 px-4 py-3 text-left"
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-base font-semibold">Annual</span>
                <span className="text-base font-semibold">{priceLabel(priceAnnual)}</span>
              </span>
              <span className="my-2 h-px w-full bg-current opacity-25" />
              <span className="text-base font-normal">{status.preview.annual.label}</span>
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-base">Card</Label>
        <SquareCardForm ref={cardRef} onError={setError} />
      </div>

      <ErrorAlert error={error} action="Renew membership" />

      <Button
        onClick={handlePay}
        disabled={
          submitting ||
          tier === null ||
          selectedPrice.isLoading ||
          !status.preview[duration].allowed
        }
        className="w-full"
      >
        {submitting ? 'Processing…' : 'Pay & Renew'}
      </Button>

      <DuesExemptSection
        exemptionRequest={status.exemptionRequest}
        targetQuarterLabel={status.preview.quarterly.label}
      />
    </div>
  )
}

function DuesExemptSection({
  exemptionRequest,
  targetQuarterLabel,
}: {
  exemptionRequest: { label: string } | null
  targetQuarterLabel: string
}) {
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mutation = useRequestDuesExemptionMutation()

  const pending = exemptionRequest !== null || mutation.isSuccess

  async function submit() {
    setError(null)
    try {
      await mutation.mutateAsync()
      setShowModal(false)
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="space-y-2 border-t pt-4">
      {pending ? (
        <div className="rounded-md border bg-muted p-3 text-sm">
          Exemption requested — pending review.
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setShowModal(true)}>
            Request Dues Exempt
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Who is dues exempt?"
                >
                  <CircleHelp className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Dues exempt for officers, position holders, instructors, honorary, etc.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Dues Exempt</DialogTitle>
            <DialogDescription className="pt-2">
              You're requesting dues-exempt membership for <strong>{targetQuarterLabel}</strong>.
              You should be sure you're eligible.
            </DialogDescription>
          </DialogHeader>
          <ErrorAlert error={error} action="Request dues exemption" />
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={submit} disabled={mutation.isPending}>
              {mutation.isPending ? 'Submitting…' : 'I understand'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
