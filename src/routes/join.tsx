import { MembershipQuestionnaireFields } from '@/components/renewals/MembershipQuestionnaireFields'
import type { SquareCardHandle } from '@/components/renewals/SquareCardForm'
import { SquareCardForm } from '@/components/renewals/SquareCardForm'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  newMemberPriceQueryOptions,
  newMemberSignupOptionsQueryOptions,
  useCheckNewMemberEmailMutation,
  useStartNewMemberPaymentMutation,
} from '@/domains/membership-applications/query-options'
import type { RenewalDuration } from '@/domains/renewals/compute-renewal'
import type {
  PlusOneResponse,
  QuestionnaireAnswers,
  UwStatus,
} from '@/domains/renewals/questionnaire'
import { tierForUwStatus } from '@/domains/renewals/questionnaire'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useRef, useState } from 'react'

export const Route = createFileRoute('/join')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(newMemberSignupOptionsQueryOptions()),
  component: JoinPage,
})

function formatMoney(cents: number, currency: string) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency })
}

type ValidationField =
  | 'firstName'
  | 'lastName'
  | 'primaryEmail'
  | 'uwStatus'
  | 'imaAcknowledged'
  | 'plusOne'
  | 'uwEmail'
  | 'duration'

type ValidationErrors = Partial<Record<ValidationField, string>>

const validationFieldIds: Record<ValidationField, string> = {
  firstName: 'join-first-name',
  lastName: 'join-last-name',
  primaryEmail: 'join-primary-email',
  uwStatus: 'join-uw-status',
  imaAcknowledged: 'join-ima-acknowledged',
  plusOne: 'join-plus-one',
  uwEmail: 'join-uw-email',
  duration: 'join-duration',
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null
  return <p className="text-sm text-destructive">{error}</p>
}

function JoinPage() {
  const { data: signupOptions } = useSuspenseQuery(newMemberSignupOptionsQueryOptions())
  const navigate = useNavigate()
  const cardRef = useRef<SquareCardHandle>(null)
  const payment = useStartNewMemberPaymentMutation()
  const emailCheck = useCheckNewMemberEmailMutation()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [primaryEmail, setPrimaryEmail] = useState('')
  const [uwEmail, setUwEmail] = useState('')
  const [uwStatus, setUwStatus] = useState<UwStatus | null>(null)
  const [imaAcknowledged, setImaAcknowledged] = useState(false)
  const [plusOne, setPlusOne] = useState<PlusOneResponse | null>(null)
  const [duration, setDuration] = useState<RenewalDuration>('annual')
  const [checkedEmail, setCheckedEmail] = useState('')
  const [existingMember, setExistingMember] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})

  const tier = uwStatus ? tierForUwStatus(uwStatus) : null
  const quarterlyPrice = useQuery({
    ...newMemberPriceQueryOptions(tier ?? 'student', 'quarterly'),
    enabled: tier !== null,
  })
  const annualPrice = useQuery({
    ...newMemberPriceQueryOptions(tier ?? 'student', 'annual'),
    enabled: tier !== null,
  })
  const selectedPrice = duration === 'annual' ? annualPrice : quarterlyPrice

  const questionnaire: QuestionnaireAnswers | null =
    uwStatus && plusOne ? { plusOneResponse: plusOne, uwStatus } : null

  function clearValidationError(field: ValidationField) {
    setValidationErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  function selectUwStatus(value: UwStatus) {
    setUwStatus(value)
    setImaAcknowledged(false)
    setPlusOne(null)
    setValidationErrors((current) => {
      const next = { ...current }
      delete next.uwStatus
      delete next.imaAcknowledged
      delete next.plusOne
      delete next.uwEmail
      delete next.duration
      return next
    })
    if (value !== 'student' && value !== 'employee_retiree') setUwEmail('')
  }

  function priceLabel(query: typeof quarterlyPrice) {
    if (!tier) return '—'
    if (query.isLoading) return '…'
    return query.data ? formatMoney(query.data.amountCents, query.data.currency) : 'Unavailable'
  }

  async function checkEmail() {
    const email = primaryEmail.trim()
    if (!/^\S+@\S+\.\S+$/.test(email) || email === checkedEmail) return
    setCheckedEmail(email)
    try {
      const result = await emailCheck.mutateAsync(email)
      setExistingMember(result.existingMember)
    } catch {
      setExistingMember(false)
      setCheckedEmail('')
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    const errors: ValidationErrors = {}
    if (!firstName.trim()) errors.firstName = 'First name is required.'
    if (!lastName.trim()) errors.lastName = 'Last name is required.'
    if (!primaryEmail.trim()) {
      errors.primaryEmail = 'Email is required.'
    } else if (!/^\S+@\S+\.\S+$/.test(primaryEmail.trim())) {
      errors.primaryEmail = 'Enter a valid email address.'
    }
    if (!uwStatus) {
      errors.uwStatus = 'Select your UW status.'
    } else {
      if (!imaAcknowledged) errors.imaAcknowledged = 'Confirm that you understand.'
      if (!plusOne) errors.plusOne = 'Select an option.'
      if (uwEmailRequired && !uwEmail.trim()) {
        errors.uwEmail = 'UW email is required for students.'
      } else if (uwEmail.trim() && !/^\S+@\S+\.\S+$/.test(uwEmail.trim())) {
        errors.uwEmail = 'Enter a valid UW email address.'
      }
      if (!selectedPrice.isLoading && !selectedPrice.data) {
        errors.duration = 'Membership pricing is unavailable. Try again.'
      }
    }
    setValidationErrors(errors)
    const firstInvalidField = Object.keys(errors)[0] as ValidationField | undefined
    if (firstInvalidField) {
      requestAnimationFrame(() => {
        const field = document.getElementById(validationFieldIds[firstInvalidField])
        field?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        const focusTarget = field?.matches('input, button')
          ? field
          : field?.querySelector<HTMLElement>('input, button')
        if (focusTarget instanceof HTMLElement) focusTarget.focus({ preventScroll: true })
      })
      return
    }
    if (!questionnaire) return
    try {
      const sourceId = await cardRef.current!.tokenize()
      const result = await payment.mutateAsync({
        duration,
        firstName,
        imaAcknowledged,
        lastName,
        primaryEmail,
        questionnaire,
        sourceId,
        uwEmail,
      })

      if (result.success) {
        await navigate({
          to: '/join/$applicationId',
          params: { applicationId: result.applicationId },
          search: {
            email: result.emailSent ? 'sent' : 'failed',
            simulated: result.emailSimulated,
          },
        })
        return
      }
      if (!result.retryAllowed && result.applicationId) {
        await navigate({
          to: '/join/$applicationId',
          params: { applicationId: result.applicationId },
          search: { email: undefined, simulated: false },
        })
        return
      }
      setError(result.message)
    } catch (caught: any) {
      setError(caught?.message ?? 'Something went wrong. Please try again.')
    }
  }

  const uwEmailRequired = uwStatus === 'student'
  const showUwEmail = uwEmailRequired || uwStatus === 'employee_retiree'

  return (
    <main className="min-h-screen bg-background [--color-primary:var(--color-wyc-purple)] [--color-ring:var(--color-wyc-purple)]">
      <header className="mx-auto flex max-w-7xl items-center justify-between border-b px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <img src="/favicon.png" alt="" className="size-12 object-contain sm:size-14" />
          <p className="font-wyc-heading text-lg font-black uppercase leading-tight tracking-[0.09em] text-wyc-purple sm:text-xl">
            Washington
            <br />
            Yacht Club
          </p>
        </div>
        <p className="hidden font-wyc-body text-sm font-medium text-wyc-purple sm:block">
          University of Washington · Seattle
        </p>
      </header>

      <section className="relative mx-auto h-[24rem] max-w-7xl overflow-hidden sm:h-[30rem] lg:h-[34rem]">
        <img
          src="/images/wyc-waterfront.jpg"
          alt="Washington Yacht Club sailors preparing boats at the Waterfront Activities Center"
          className="size-full object-cover object-[center_62%] sm:object-[center_58%]"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/25 via-35% to-transparent" />
        <div className="absolute inset-y-0 left-0 flex max-w-2xl flex-col justify-center px-6 text-white drop-shadow-lg sm:px-10 lg:px-12">
          <h1 className="font-wyc-heading text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Join the Club
          </h1>
          <p className="mt-5 max-w-xl font-wyc-body text-base leading-7 sm:text-lg sm:leading-8">
            Learn to sail, meet new people,
            <br className="hidden sm:block" /> and find your community on the water.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl items-start px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(34rem,1.2fr)] lg:px-8 lg:py-14">
        <aside className="space-y-10 pb-10 lg:pr-12">
          <section className="space-y-5">
            <h2 className="font-wyc-heading text-3xl font-bold tracking-tight text-wyc-purple">
              Membership Benefits
            </h2>
            <ul className="list-disc space-y-3 pl-5 font-wyc-body text-sm leading-6 marker:text-wyc-purple sm:text-base">
              <li>Free Sailing &amp; Windsurfing Lessons</li>
              <li>Go sailing on your own or with friends during supervised sailing</li>
              <li>Dinghy, catamaran, and daysailer checkout (no additional reservation fees)</li>
              <li>Social events</li>
              <li>Snooze &amp; Cruise</li>
              <li>Keelboat checkouts (with appropriate ratings)</li>
            </ul>
          </section>

          <section className="space-y-5">
            <h2 className="font-wyc-heading text-3xl font-bold tracking-tight text-wyc-purple">
              Cost
            </h2>
            <p className="font-wyc-body text-sm leading-6 text-muted-foreground">
              WYC memberships are available quarterly or annually. Dues go towards boat maintenance,
              insurance, fuel, safety equipment, instruction, and social events.
            </p>
            <div className="border-y text-sm">
              <div className="grid grid-cols-[1.15fr_repeat(3,minmax(0,1fr))] font-wyc-heading text-xs font-bold text-wyc-purple">
                <span className="py-3 pr-2">Membership</span>
                <span className="px-1 py-3 text-center">Initiation fee</span>
                <span className="px-1 py-3 text-center">Quarterly dues</span>
                <span className="px-1 py-3 text-center">Annual dues</span>
              </div>
              <div className="grid grid-cols-[1.15fr_repeat(3,minmax(0,1fr))] items-center border-t">
                <span className="py-3 pr-2 font-medium">Student</span>
                <span className="px-1 py-3 text-center">--</span>
                <span className="px-1 py-3 text-center">$60</span>
                <span className="px-1 py-3 text-center">$150</span>
              </div>
              <div className="grid grid-cols-[1.15fr_repeat(3,minmax(0,1fr))] items-center border-t">
                <span className="py-3 pr-2 font-medium">Non-student</span>
                <span className="px-1 py-3 text-center">--</span>
                <span className="px-1 py-3 text-center">$100</span>
                <span className="px-1 py-3 text-center">$280</span>
              </div>
            </div>
          </section>
        </aside>

        <div className="border-t border-wyc-purple pt-10 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
          <form onSubmit={submit} className="space-y-8" noValidate>
            <section className="space-y-5">
              <h2 className="font-wyc-heading text-3xl font-bold tracking-tight text-wyc-purple">
                Membership Sign-up Form
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="join-first-name">First name *</Label>
                  <Input
                    id="join-first-name"
                    value={firstName}
                    onChange={(event) => {
                      setFirstName(event.target.value)
                      clearValidationError('firstName')
                    }}
                    autoComplete="given-name"
                    required
                    maxLength={60}
                  />
                  <FieldError error={validationErrors.firstName} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="join-last-name">Last name *</Label>
                  <Input
                    id="join-last-name"
                    value={lastName}
                    onChange={(event) => {
                      setLastName(event.target.value)
                      clearValidationError('lastName')
                    }}
                    autoComplete="family-name"
                    required
                    maxLength={60}
                  />
                  <FieldError error={validationErrors.lastName} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="join-primary-email">Email *</Label>
                <Input
                  id="join-primary-email"
                  type="email"
                  value={primaryEmail}
                  onChange={(event) => {
                    setPrimaryEmail(event.target.value)
                    setExistingMember(false)
                    clearValidationError('primaryEmail')
                  }}
                  onBlur={checkEmail}
                  autoComplete="email"
                  required
                  maxLength={254}
                />
                <FieldError error={validationErrors.primaryEmail} />
                {existingMember && (
                  <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                    We already have this email on file. If you are already a member, you can{' '}
                    <Link to="/forgot-password" className="font-medium underline">
                      recover your WYC number or password
                    </Link>
                    . You can still continue if this is a new application.
                  </div>
                )}
              </div>
            </section>

            <div className="space-y-6">
              <MembershipQuestionnaireFields
                idPrefix="join"
                errors={validationErrors}
                uwStatus={uwStatus}
                imaAcknowledged={imaAcknowledged}
                plusOne={plusOne}
                onUwStatusChange={selectUwStatus}
                onImaAcknowledgedChange={(value) => {
                  setImaAcknowledged(value)
                  if (value) clearValidationError('imaAcknowledged')
                }}
                onPlusOneChange={(value) => {
                  setPlusOne(value)
                  clearValidationError('plusOne')
                }}
              />

              {showUwEmail && (
                <div className="space-y-2">
                  <Label htmlFor="join-uw-email">
                    UW email{uwEmailRequired ? ' *' : ' (optional)'}
                  </Label>
                  <Input
                    id="join-uw-email"
                    type="email"
                    value={uwEmail}
                    onChange={(event) => {
                      setUwEmail(event.target.value)
                      clearValidationError('uwEmail')
                    }}
                    autoComplete="email"
                    required={uwEmailRequired}
                    maxLength={254}
                  />
                  <FieldError error={validationErrors.uwEmail} />
                </div>
              )}

              <div id="join-duration" className="space-y-2">
                <Label className="text-base">Duration</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(['quarterly', 'annual'] as const).map((option) => {
                    const price = option === 'annual' ? annualPrice : quarterlyPrice
                    const details = signupOptions[option]
                    return (
                      <Button
                        key={option}
                        type="button"
                        variant={duration === option ? 'default' : 'outline'}
                        onClick={() => {
                          setDuration(option)
                          clearValidationError('duration')
                        }}
                        disabled={!tier}
                        className="h-auto flex-col items-stretch gap-0 whitespace-normal border-2 px-4 py-3 text-left"
                      >
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="text-base font-semibold capitalize">{option}</span>
                          <span className="text-base font-semibold">{priceLabel(price)}</span>
                        </span>
                        <span className="my-2 h-px w-full bg-current opacity-25" />
                        <span className="text-base font-normal">Through {details.targetLabel}</span>
                      </Button>
                    )
                  })}
                </div>
                <FieldError error={validationErrors.duration} />
              </div>
            </div>

            <section className="space-y-5 border-t pt-8">
              <h2 className="font-wyc-heading text-xl font-bold text-wyc-purple">Payment</h2>
              <div className="space-y-2">
                <Label>Card</Label>
                <SquareCardForm ref={cardRef} onError={setError} />
              </div>
              <ErrorAlert error={error} action="Pay membership dues" />
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={payment.isPending || (tier !== null && selectedPrice.isLoading)}
              >
                {payment.isPending ? 'Processing…' : 'Pay and Sign Up'}
              </Button>
            </section>
          </form>
        </div>
      </div>
    </main>
  )
}
