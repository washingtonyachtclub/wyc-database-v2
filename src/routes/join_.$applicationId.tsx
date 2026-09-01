import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { EmailSimulatedNotice } from '@/components/ui/EmailSimulatedNotice'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  newMemberApplicationQueryOptions,
  useCompleteNewMemberApplicationMutation,
} from '@/domains/membership-applications/query-options'
import {
  communityOptions,
  CURRENT_NEW_MEMBER_QUESTIONNAIRE_VERSION,
  genderIdentityOptions,
  referralSourceOptions,
  residentialStatusOptions,
  studentStatusOptions,
  type NewMemberQuestionnaireInput,
} from '@/domains/membership-applications/questionnaire'
import { MemberWaiverAgreementFields } from '@/domains/waivers/MemberWaiverAgreementFields'
import { isDevEnvironment } from '@/lib/env'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/join_/$applicationId')({
  validateSearch: (search: Record<string, unknown>) => {
    const email: 'sent' | 'failed' | undefined =
      search.email === 'sent' || search.email === 'failed' ? search.email : undefined
    return {
      email,
      simulated: search.simulated === true || search.simulated === 'true',
    }
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(newMemberApplicationQueryOptions(params.applicationId)),
  component: CompleteNewMemberApplicationPage,
})

type ContactForm = {
  addressLine1: string
  addressLine2: string
  city: string
  emergencyFirstName: string
  emergencyLastName: string
  emergencyPhone: string
  emergencyRelationship: string
  phone: string
  state: string
  zipCode: string
}

type QuestionnaireSelection =
  | 'communities'
  | 'gender_identity'
  | 'referral_source'
  | 'residential_status'
  | 'student_status'

type ValidationField =
  | keyof ContactForm
  | 'adultAcknowledged'
  | 'gender_self_description'
  | 'referral_other'
  | 'signatureDataUrl'
  | 'testAcknowledged'

type ValidationErrors = Partial<Record<ValidationField, string>>

const emptyContact: ContactForm = {
  addressLine1: '',
  addressLine2: '',
  city: '',
  emergencyFirstName: '',
  emergencyLastName: '',
  emergencyPhone: '',
  emergencyRelationship: '',
  phone: '',
  state: '',
  zipCode: '',
}

const contactRequirements: Array<{
  field: keyof ContactForm
  id: string
  label: string
}> = [
  { field: 'addressLine1', id: 'application-address-1', label: 'Address' },
  { field: 'city', id: 'application-city', label: 'City' },
  { field: 'state', id: 'application-state', label: 'State' },
  { field: 'zipCode', id: 'application-zip', label: 'ZIP code' },
  { field: 'phone', id: 'application-phone', label: 'Phone' },
  {
    field: 'emergencyFirstName',
    id: 'emergency-first-name',
    label: 'Emergency contact first name',
  },
  { field: 'emergencyLastName', id: 'emergency-last-name', label: 'Emergency contact last name' },
  { field: 'emergencyPhone', id: 'emergency-phone', label: 'Emergency contact phone' },
  {
    field: 'emergencyRelationship',
    id: 'emergency-relationship',
    label: 'Emergency contact relationship',
  },
]

const validationFieldIds: Record<ValidationField, string> = {
  addressLine1: 'application-address-1',
  addressLine2: 'application-address-2',
  adultAcknowledged: 'new-member-adult-acknowledgement',
  city: 'application-city',
  emergencyFirstName: 'emergency-first-name',
  emergencyLastName: 'emergency-last-name',
  emergencyPhone: 'emergency-phone',
  emergencyRelationship: 'emergency-relationship',
  gender_self_description: 'gender-self-description',
  phone: 'application-phone',
  referral_other: 'referral-other',
  signatureDataUrl: 'new-member-signature',
  state: 'application-state',
  testAcknowledged: 'new-member-test-acknowledgement',
  zipCode: 'application-zip',
}

function ProcessingConfirmation() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          Washington Yacht Club
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Application submitted</h1>
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-5">
          You have submitted all required information. We are processing your membership, and you
          will receive an email with your account details shortly.
        </div>
      </div>
    </main>
  )
}

function CompleteNewMemberApplicationPage() {
  const { applicationId } = Route.useParams()
  const search = Route.useSearch()
  const { data } = useSuspenseQuery(newMemberApplicationQueryOptions(applicationId))

  if (data.status === 'not_found') {
    return (
      <StatusPage title="Application not found">
        Check that you copied the complete link from your email.
      </StatusPage>
    )
  }

  const application = data.application
  if (
    application.reviewStatus === 'approved_new' ||
    application.reviewStatus === 'approved_existing'
  ) {
    return (
      <StatusPage title="Membership processed">
        This application has been approved. Check your email for your membership details.
      </StatusPage>
    )
  }
  if (application.reviewStatus === 'closed') {
    return (
      <StatusPage title="Application closed">
        This application is closed. Please contact the club if you have questions.
      </StatusPage>
    )
  }
  if (application.requirementsComplete || application.reviewStatus !== 'not_ready') {
    return <ProcessingConfirmation />
  }
  if (application.paymentStatus === 'reconciliation_required') {
    return (
      <StatusPage title="Payment needs review">
        We could not confirm the final payment result. Do not pay again. Please contact the club and
        include this application ID: <span className="font-mono text-sm">{applicationId}</span>.
      </StatusPage>
    )
  }
  if (application.paymentStatus !== 'completed') {
    return (
      <StatusPage title="Payment not completed">
        This application does not have a completed payment. Return to the{' '}
        <Link to="/join" className="font-medium text-primary underline">
          membership signup page
        </Link>{' '}
        to try again.
      </StatusPage>
    )
  }
  if (application.questionnaireVersion !== CURRENT_NEW_MEMBER_QUESTIONNAIRE_VERSION) {
    return (
      <StatusPage title="Application unavailable">
        This application uses a questionnaire version that is not available. Please contact the
        club.
      </StatusPage>
    )
  }

  return (
    <CompletionForm
      application={application}
      applicationId={applicationId}
      emailStatus={search.email}
      emailSimulated={search.simulated}
    />
  )
}

function StatusPage({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          Washington Yacht Club
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <div className="rounded-lg border bg-muted p-5">{children}</div>
      </div>
    </main>
  )
}

function CompletionForm({
  application,
  applicationId,
  emailSimulated,
  emailStatus,
}: {
  application: {
    firstName: string
    lastName: string
    primaryEmail: string
    targetLabel: string
  }
  applicationId: string
  emailSimulated: boolean
  emailStatus: 'sent' | 'failed' | undefined
}) {
  const isMock = isDevEnvironment()
  const mutation = useCompleteNewMemberApplicationMutation()
  const [contact, setContact] = useState(emptyContact)
  const [questionnaire, setQuestionnaire] = useState<NewMemberQuestionnaireInput>({
    communities: [],
    gender_identity: [],
    referral_source: [],
    residential_status: [],
    student_status: [],
  })
  const [adultAcknowledged, setAdultAcknowledged] = useState(false)
  const [signatureDataUrl, setSignatureDataUrl] = useState('')
  const [testAcknowledged, setTestAcknowledged] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [submitted, setSubmitted] = useState(false)

  function clearValidationError(field: ValidationField) {
    setValidationErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  function setContactField(field: keyof ContactForm, value: string) {
    setContact((current) => ({ ...current, [field]: value }))
    clearValidationError(field)
  }

  function toggleQuestionOption(
    question: QuestionnaireSelection,
    id: string,
    selected: boolean,
    exclusiveOption?: string,
  ) {
    setQuestionnaire((current) => {
      const values = (current[question] ?? []) as string[]
      const next = !selected
        ? values.filter((value) => value !== id)
        : id === exclusiveOption
          ? [id]
          : [...values.filter((value) => value !== exclusiveOption && value !== id), id]
      return {
        ...current,
        [question]: next,
        ...(question === 'gender_identity' && !next.includes('self_describe')
          ? { gender_self_description: undefined }
          : {}),
        ...(question === 'referral_source' && !next.includes('other')
          ? { referral_other: undefined }
          : {}),
      }
    })
    if (question === 'gender_identity') clearValidationError('gender_self_description')
    if (question === 'referral_source') clearValidationError('referral_other')
  }

  function validate(): ValidationErrors {
    const errors: ValidationErrors = {}
    for (const requirement of contactRequirements) {
      if (!contact[requirement.field].trim()) {
        errors[requirement.field] = `${requirement.label} is required.`
      }
    }
    if ([contact.addressLine1, contact.addressLine2].filter(Boolean).join(', ').length > 100) {
      errors.addressLine2 = 'The combined street address must be 100 characters or fewer.'
    }
    if (
      questionnaire.gender_identity?.includes('self_describe') &&
      !questionnaire.gender_self_description?.trim()
    ) {
      errors.gender_self_description = 'Describe your gender identity.'
    }
    if (questionnaire.referral_source?.includes('other') && !questionnaire.referral_other?.trim()) {
      errors.referral_other = 'Enter how you heard about the club.'
    }
    if (!adultAcknowledged) errors.adultAcknowledged = 'The adult acknowledgement is required.'
    if (!signatureDataUrl) errors.signatureDataUrl = 'A signature is required.'
    if (isMock && !testAcknowledged) {
      errors.testAcknowledged = 'The mock waiver acknowledgement is required.'
    }
    return errors
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setServerError(null)
    const errors = validate()
    setValidationErrors(errors)
    const firstInvalidField = Object.keys(errors)[0] as ValidationField | undefined
    if (firstInvalidField) {
      requestAnimationFrame(() => {
        const field = document.getElementById(validationFieldIds[firstInvalidField])
        field?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        field?.focus({ preventScroll: true })
      })
      return
    }
    try {
      const result = await mutation.mutateAsync({
        adultAcknowledged,
        applicationId,
        contact,
        questionnaire,
        signatureDataUrl,
        testAcknowledged,
      })
      if (!result.success) {
        setServerError(result.message)
        return
      }
      setSubmitted(true)
    } catch (caught: any) {
      setServerError(caught?.message ?? 'Something went wrong. Please try again.')
    }
  }

  if (submitted) return <ProcessingConfirmation />

  return (
    <main className="min-h-screen bg-background">
      {isMock && (
        <div className="m-4 rounded-lg border-2 border-destructive bg-destructive/10 p-5 text-destructive">
          <p className="text-xl font-black tracking-wide">MOCK WAIVER - TESTING PURPOSES ONLY</p>
          <p className="mt-2 font-semibold">
            This is not a valid waiver. Submitting creates a development application and PDF.
          </p>
        </div>
      )}

      <header className="space-y-3 border-b px-4 py-7 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          Washington Yacht Club
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Complete your application</h1>
        <p className="text-muted-foreground">
          Your payment was received. Add your contact information and sign the member waiver.
        </p>
        <dl className="grid gap-1 text-sm sm:grid-cols-[8rem_1fr]">
          <dt className="font-medium">Applicant</dt>
          <dd>
            {application.firstName} {application.lastName}
          </dd>
          <dt className="font-medium">Email</dt>
          <dd className="break-all">{application.primaryEmail}</dd>
          <dt className="font-medium">Membership</dt>
          <dd>Through {application.targetLabel}</dd>
        </dl>
        {emailStatus === 'failed' && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            Your payment succeeded, but the recovery email could not be delivered. Save this page's
            link until you submit the application.
          </div>
        )}
        {emailSimulated && <EmailSimulatedNotice />}
      </header>

      <form onSubmit={submit} className="divide-y" noValidate>
        <section className="space-y-6 px-4 py-7 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold">Contact information</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput
              id="application-address-1"
              label="Address"
              value={contact.addressLine1}
              onChange={(value) => setContactField('addressLine1', value)}
              autoComplete="address-line1"
              error={validationErrors.addressLine1}
              maxLength={100}
              required
            />
            <TextInput
              id="application-address-2"
              label="Address line 2 (optional)"
              value={contact.addressLine2}
              onChange={(value) => setContactField('addressLine2', value)}
              autoComplete="address-line2"
              error={validationErrors.addressLine2}
              maxLength={100}
            />
            <TextInput
              id="application-city"
              label="City"
              value={contact.city}
              onChange={(value) => setContactField('city', value)}
              autoComplete="address-level2"
              error={validationErrors.city}
              maxLength={50}
              required
            />
            <TextInput
              id="application-state"
              label="State"
              value={contact.state}
              onChange={(value) => setContactField('state', value)}
              autoComplete="address-level1"
              error={validationErrors.state}
              maxLength={20}
              required
            />
            <TextInput
              id="application-zip"
              label="ZIP code"
              value={contact.zipCode}
              onChange={(value) => setContactField('zipCode', value)}
              autoComplete="postal-code"
              error={validationErrors.zipCode}
              maxLength={10}
              required
            />
            <TextInput
              id="application-phone"
              label="Phone"
              value={contact.phone}
              onChange={(value) => setContactField('phone', value)}
              autoComplete="tel"
              error={validationErrors.phone}
              maxLength={50}
              required
            />
          </div>
        </section>

        <section className="space-y-6 px-4 py-7 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold">Emergency contact</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput
              id="emergency-first-name"
              label="First name"
              value={contact.emergencyFirstName}
              onChange={(value) => setContactField('emergencyFirstName', value)}
              error={validationErrors.emergencyFirstName}
              maxLength={60}
              required
            />
            <TextInput
              id="emergency-last-name"
              label="Last name"
              value={contact.emergencyLastName}
              onChange={(value) => setContactField('emergencyLastName', value)}
              error={validationErrors.emergencyLastName}
              maxLength={60}
              required
            />
            <TextInput
              id="emergency-phone"
              label="Phone"
              value={contact.emergencyPhone}
              onChange={(value) => setContactField('emergencyPhone', value)}
              autoComplete="tel"
              error={validationErrors.emergencyPhone}
              maxLength={50}
              required
            />
            <TextInput
              id="emergency-relationship"
              label="Relationship"
              value={contact.emergencyRelationship}
              onChange={(value) => setContactField('emergencyRelationship', value)}
              error={validationErrors.emergencyRelationship}
              maxLength={100}
              required
            />
          </div>
        </section>

        <section className="space-y-6 px-4 py-7 sm:px-6 lg:px-8">
          <div>
            <h2 className="text-xl font-bold">Optional demographics</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These questions help the club understand its membership.
            </p>
          </div>
          <QuestionCheckboxGroup
            idPrefix="residential-status"
            label="Which of the following best describes your residential status?"
            options={residentialStatusOptions}
            values={questionnaire.residential_status}
            onChange={(id, selected) => toggleQuestionOption('residential_status', id, selected)}
          />
          <QuestionCheckboxGroup
            idPrefix="student-status"
            label="Which of the following best describes your student status?"
            options={studentStatusOptions}
            values={questionnaire.student_status}
            onChange={(id, selected) =>
              toggleQuestionOption('student_status', id, selected, 'not_applicable')
            }
          />
          <QuestionCheckboxGroup
            idPrefix="gender-identity"
            label="Which of the following best describes your gender identity?"
            options={genderIdentityOptions}
            values={questionnaire.gender_identity}
            onChange={(id, selected) =>
              toggleQuestionOption('gender_identity', id, selected, 'prefer_not_to_say')
            }
          />
          {questionnaire.gender_identity?.includes('self_describe') && (
            <TextInput
              id="gender-self-description"
              label="Describe your gender identity"
              value={questionnaire.gender_self_description ?? ''}
              onChange={(value) => {
                setQuestionnaire((current) => ({
                  ...current,
                  gender_self_description: value,
                }))
                clearValidationError('gender_self_description')
              }}
              error={validationErrors.gender_self_description}
              maxLength={200}
              required
            />
          )}
          <QuestionCheckboxGroup
            idPrefix="community"
            label="Do you identify with any of the following communities or experiences?"
            options={communityOptions}
            values={questionnaire.communities}
            onChange={(id, selected) => toggleQuestionOption('communities', id, selected, 'none')}
          />
          <QuestionCheckboxGroup
            idPrefix="referral-source"
            label="How did you hear about the club?"
            options={referralSourceOptions}
            values={questionnaire.referral_source}
            onChange={(id, selected) => toggleQuestionOption('referral_source', id, selected)}
          />
          {questionnaire.referral_source?.includes('other') && (
            <TextInput
              id="referral-other"
              label="How did you hear about the club?"
              value={questionnaire.referral_other ?? ''}
              onChange={(value) => {
                setQuestionnaire((current) => ({ ...current, referral_other: value }))
                clearValidationError('referral_other')
              }}
              error={validationErrors.referral_other}
              maxLength={300}
              required
            />
          )}
        </section>

        <MemberWaiverAgreementFields
          adultAcknowledged={adultAcknowledged}
          adultError={validationErrors.adultAcknowledged}
          disabled={mutation.isPending}
          idPrefix="new-member"
          isMock={isMock}
          onAdultAcknowledgedChange={(value) => {
            setAdultAcknowledged(value)
            clearValidationError('adultAcknowledged')
          }}
          onSignatureChange={(value) => {
            setSignatureDataUrl(value)
            clearValidationError('signatureDataUrl')
          }}
          onTestAcknowledgedChange={(value) => {
            setTestAcknowledged(value)
            clearValidationError('testAcknowledged')
          }}
          signatureError={validationErrors.signatureDataUrl}
          testAcknowledged={testAcknowledged}
          testError={validationErrors.testAcknowledged}
        />

        <section className="space-y-4 px-4 py-7 sm:px-6 lg:px-8">
          {Object.keys(validationErrors).length > 0 && (
            <div
              role="alert"
              className="rounded-lg border border-destructive bg-destructive/10 p-4"
            >
              <p className="font-medium text-destructive">Complete the required fields:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-destructive">
                {Object.entries(validationErrors).map(([field, message]) => (
                  <li key={field}>{message}</li>
                ))}
              </ul>
            </div>
          )}
          <ErrorAlert error={serverError} action="Complete membership application" />
          <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending
              ? 'Submitting…'
              : isMock
                ? 'Submit mock application'
                : 'Submit application'}
          </Button>
        </section>
      </form>
    </main>
  )
}

function TextInput({
  autoComplete,
  error,
  id,
  label,
  maxLength,
  onChange,
  required,
  value,
}: {
  autoComplete?: string
  error?: string
  id: string
  label: string
  maxLength: number
  onChange: (value: string) => void
  required?: boolean
  value: string
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={Boolean(error)}
        maxLength={maxLength}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

function QuestionCheckboxGroup<T extends string>({
  idPrefix,
  label,
  onChange,
  options,
  values,
}: {
  idPrefix: string
  label: string
  onChange: (id: T, selected: boolean) => void
  options: readonly { id: T; label: string }[]
  values: T[] | undefined
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => {
          const id = `${idPrefix}-${option.id}`
          return (
            <div key={option.id} className="flex items-start gap-3">
              <Checkbox
                id={id}
                checked={values?.includes(option.id) ?? false}
                onCheckedChange={(checked) => onChange(option.id, checked === true)}
              />
              <Label htmlFor={id} className="font-normal leading-5">
                {option.label}
              </Label>
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}
