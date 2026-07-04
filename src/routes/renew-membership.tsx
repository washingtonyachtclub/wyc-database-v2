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
import type { RenewalDuration } from '@/domains/renewals/compute-renewal'
import {
  getRenewalPriceQueryOptions,
  getRenewalStatusQueryOptions,
  useCancelDuesExemptionMutation,
  usePayAndRenewMutation,
  useRequestDuesExemptionMutation,
} from '@/domains/renewals/query-options'
import type {
  PlusOneResponse,
  QuestionnaireAnswers,
  UwStatus,
} from '@/domains/renewals/questionnaire'
import { tierForUwStatus } from '@/domains/renewals/questionnaire'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { CircleHelp } from 'lucide-react'
import { useRef, useState } from 'react'

export const Route = createFileRoute('/renew-membership')({
  validateSearch: (search: Record<string, unknown>) => {
    const redirectTo = search.redirect as string | undefined
    return redirectTo ? { redirect: redirectTo } : {}
  },
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

const UW_STATUS_OPTIONS: { value: UwStatus; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'employee_retiree', label: 'Employee/Retiree' },
  { value: 'neither', label: 'Neither' },
]

const IMA_PURCHASE_URL = 'https://www.washington.edu/ima/member/'

const SPONSOR_OPTIONS: { value: PlusOneResponse; label: string }[] = [
  {
    value: 'sponsor_already',
    label: 'I am already sponsoring a WYC member and can coordinate renewal with them on my own',
  },
  { value: 'sponsor_yes', label: 'Yes' },
  { value: 'sponsor_no', label: 'No' },
]

const SPONSEE_OPTIONS: { value: PlusOneResponse; label: string }[] = [
  {
    value: 'sponsee_already',
    label: 'No, I am already sponsored and can coordinate renewal with them on my own',
  },
  {
    value: 'sponsee_no_facilities',
    label: 'No, I will not use the facilities/docks at the Waterfront Activities Center',
  },
  { value: 'sponsee_yes', label: 'Yes' },
]

const SPONSOR_HELPER =
  'We will pair you with a WYC member via email for the two of you to coordinate a time to visit the IMA for them to purchase a Plus One membership through you.'
const SPONSEE_HELPER =
  'If a current WYC member is willing to sponsor, we will pair you via email for the two of you to coordinate a time to visit the IMA for you to purchase a Plus One membership through them.'

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
  const { redirect: redirectTo } = Route.useSearch()
  const navigate = useNavigate()

  // Quarterly is the smallest jump, so if it's over the cap nothing can be renewed right now.
  const canRenew = status.preview.quarterly.allowed

  // Questionnaire (required, shown above duration/card). UW status drives the price tier.
  const [uwStatus, setUwStatus] = useState<UwStatus | null>(null)
  const [imaAcknowledged, setImaAcknowledged] = useState(false)
  const [plusOne, setPlusOne] = useState<PlusOneResponse | null>(null)

  const [duration, setDuration] = useState<RenewalDuration>(
    status.preview.annual.allowed ? 'annual' : 'quarterly',
  )
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<RenewResult | null>(null)
  const [exemptRequested, setExemptRequested] = useState(false)

  const cardRef = useRef<SquareCardHandle>(null)
  const mutation = usePayAndRenewMutation()

  function selectUwStatus(next: UwStatus) {
    setUwStatus(next)
    // Follow-up answers depend on the status, so clear them when it changes.
    setImaAcknowledged(false)
    setPlusOne(null)
  }

  // Complete, validated answers (null until every required follow-up is filled).
  const questionnaire: QuestionnaireAnswers | null =
    uwStatus && plusOne && imaAcknowledged
      ? {
          uwStatus,
          plusOneResponse: plusOne,
        }
      : null

  const tier = uwStatus ? tierForUwStatus(uwStatus) : null

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
    if (!questionnaire) return
    setError(null)
    setSubmitting(true)
    try {
      const sourceId = await cardRef.current!.tokenize()
      const data = await mutation.mutateAsync({ duration, sourceId, questionnaire })
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
        {redirectTo && (
          <Button className="w-full" onClick={() => navigate({ to: redirectTo })}>
            Continue to sign up
          </Button>
        )}
      </div>
    )
  }

  if (status.exemptionRequest || exemptRequested) {
    return (
      <ExemptionRequestedScreen
        quarterLabel={status.exemptionRequest?.label ?? status.preview.quarterly.label}
        onCancelled={() => setExemptRequested(false)}
      />
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
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="text-2xl font-bold">Renew Membership</h1>

      <p>
        Your membership is paid through <strong>{status.expireQtrLabel}</strong>.
      </p>

      <ChoiceGroup
        label="What is your UW Status?"
        options={UW_STATUS_OPTIONS}
        value={uwStatus}
        onChange={selectUwStatus}
      />

      {uwStatus && (
        <div className="space-y-2">
          <p className="text-base">
            An IMA rec membership is required to use the WAC docks and facilities.{' '}
            <a
              href={IMA_PURCHASE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline"
            >
              Membership Info
            </a>
          </p>
          <Button
            type="button"
            variant={imaAcknowledged ? 'default' : 'outline'}
            onClick={() => setImaAcknowledged((v) => !v)}
            className="h-auto w-full justify-start whitespace-normal border-2 px-4 py-3 text-left text-base font-normal"
          >
            I understand
          </Button>
        </div>
      )}

      {(uwStatus === 'student' || uwStatus === 'employee_retiree') && (
        <ChoiceGroup
          label="Are you willing to sponsor a WYC member as your Plus One?"
          helper={SPONSOR_HELPER}
          options={SPONSOR_OPTIONS}
          value={plusOne}
          onChange={setPlusOne}
        />
      )}

      {uwStatus === 'neither' && (
        <ChoiceGroup
          label="Would you like to be paired with a student to sign up for an Plus One Membership?"
          helper={SPONSEE_HELPER}
          options={SPONSEE_OPTIONS}
          value={plusOne}
          onChange={setPlusOne}
        />
      )}
      <div className="space-y-2">
        <Label className="text-base">Duration</Label>
        {uwStatus === null && (
          <p className="text-base font-medium text-muted-foreground">
            Answer the questions above to see pricing.
          </p>
        )}
        <div
          className={`grid gap-3 ${status.preview.annual.allowed ? 'grid-cols-2' : 'grid-cols-1'}`}
        >
          <Button
            type="button"
            variant={duration === 'quarterly' ? 'default' : 'outline'}
            onClick={() => setDuration('quarterly')}
            disabled={uwStatus === null}
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
              disabled={uwStatus === null}
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
          questionnaire === null ||
          selectedPrice.isLoading ||
          !status.preview[duration].allowed
        }
        className="w-full"
      >
        {submitting ? 'Processing…' : 'Pay & Renew'}
      </Button>

      <DuesExemptSection
        targetQuarterLabel={status.preview.quarterly.label}
        questionnaire={questionnaire}
        onRequested={() => setExemptRequested(true)}
      />
    </div>
  )
}

function ChoiceGroup<T extends string>({
  label,
  helper,
  options,
  value,
  onChange,
}: {
  label: string
  helper?: string
  options: { value: T; label: string }[]
  value: T | null
  onChange: (value: T) => void
}) {
  return (
    <div className="space-y-2">
      <Label className="text-base">{label}</Label>
      <div className="grid gap-2">
        {options.map((opt) => (
          <Button
            key={opt.value}
            type="button"
            variant={value === opt.value ? 'default' : 'outline'}
            onClick={() => onChange(opt.value)}
            className="h-auto justify-start whitespace-normal border-2 px-4 py-3 text-left text-base font-normal"
          >
            {opt.label}
          </Button>
        ))}
      </div>
      {helper && <p className="text-sm text-muted-foreground">{helper}</p>}
    </div>
  )
}

function DuesExemptSection({
  targetQuarterLabel,
  questionnaire,
  onRequested,
}: {
  targetQuarterLabel: string
  questionnaire: QuestionnaireAnswers | null
  onRequested: () => void
}) {
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mutation = useRequestDuesExemptionMutation()

  async function submit() {
    if (!questionnaire) return
    setError(null)
    try {
      await mutation.mutateAsync(questionnaire)
      setShowModal(false)
      onRequested()
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="space-y-2 border-t pt-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setShowModal(true)}
          disabled={questionnaire === null}
        >
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

function ExemptionRequestedScreen({
  quarterLabel,
  onCancelled,
}: {
  quarterLabel: string
  onCancelled: () => void
}) {
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mutation = useCancelDuesExemptionMutation()

  async function cancel() {
    setError(null)
    try {
      await mutation.mutateAsync()
      setShowModal(false)
      onCancelled()
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="p-4 max-w-md space-y-4">
      <h1 className="text-2xl font-bold">Dues Exemption Requested</h1>
      <div className="rounded-md border border-green-300 bg-green-50 p-4 text-green-800">
        <p className="font-semibold">Your request is in.</p>
        <p className="mt-1">
          We've submitted your dues-exemption request for <strong>{quarterLabel}</strong>. A club
          officer will review it, and you'll get an email once it's approved.
        </p>
      </div>
      <Button variant="outline" className="w-full" onClick={() => setShowModal(true)}>
        Cancel request
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cancel exemption request?</DialogTitle>
            <DialogDescription className="pt-2">
              This withdraws your dues-exemption request for <strong>{quarterLabel}</strong>. You
              can request again or renew by paying.
            </DialogDescription>
          </DialogHeader>
          <ErrorAlert error={error} action="Cancel exemption request" />
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
              disabled={mutation.isPending}
            >
              Keep request
            </Button>
            <Button onClick={cancel} disabled={mutation.isPending}>
              {mutation.isPending ? 'Cancelling…' : 'Cancel request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
