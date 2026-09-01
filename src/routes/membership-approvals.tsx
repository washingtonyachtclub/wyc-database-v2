import { Button } from '@/components/ui/button'
import { EmailSimulatedNotice } from '@/components/ui/EmailSimulatedNotice'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MemberCombobox } from '@/components/ui/MemberCombobox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { listMembershipApplicationsForApproval } from '@/domains/membership-applications/approval-server-fns'
import {
  membershipApplicationsForApprovalQueryOptions,
  useApplyMembershipApplicationToExistingMemberMutation,
  useApproveNewMembershipApplicationMutation,
  useCloseMembershipApplicationMutation,
  useResendMembershipApplicationCompletionEmailMutation,
  useRetryMembershipApplicationWelcomeEmailMutation,
  useUpdateMembershipApplicationEmailsMutation,
} from '@/domains/membership-applications/query-options'
import { listPendingExemptionRequests } from '@/domains/renewals/exemption-server-fns'
import {
  getPendingExemptionsQueryOptions,
  useApproveExemptionMutation,
  useDenyExemptionMutation,
} from '@/domains/renewals/query-options'
import { requirePrivilegeForRoute } from '@/lib/route-guards'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ChevronDown, ChevronUp, Ellipsis, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'

type ApprovalCategory = 'dues-exemptions' | 'new-members'
type Application = Awaited<ReturnType<typeof listMembershipApplicationsForApproval>>[number]
type ReviewAction =
  | { kind: 'approve-new' }
  | { kind: 'apply-existing'; wycNumber: number }
  | { kind: 'close' }
  | null

export const Route = createFileRoute('/membership-approvals')({
  validateSearch: (search: Record<string, unknown>) => ({
    category:
      search.category === 'dues-exemptions'
        ? 'dues-exemptions'
        : ('new-members' as ApprovalCategory),
  }),
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/membership-approvals')
    return { canReviewExemptions: true, canReviewMembers: true }
  },
  component: MembershipApprovalsPage,
})

function MembershipApprovalsPage() {
  const { category } = Route.useSearch()
  const { canReviewExemptions, canReviewMembers } = Route.useRouteContext()
  const navigate = useNavigate()
  const applications = useQuery({
    ...membershipApplicationsForApprovalQueryOptions(),
    enabled: canReviewMembers,
  })
  const exemptions = useQuery({
    ...getPendingExemptionsQueryOptions(),
    enabled: canReviewExemptions,
  })

  function selectCategory(next: ApprovalCategory) {
    void navigate({
      to: '/membership-approvals',
      search: (previous) => ({ ...previous, category: next }),
      resetScroll: false,
    })
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Membership Approvals</h1>

      <div className="flex flex-wrap gap-2 border-b pb-4">
        {canReviewMembers && (
          <Button
            type="button"
            variant={category === 'new-members' ? 'default' : 'outline'}
            onClick={() => selectCategory('new-members')}
          >
            New members ({applications.data?.length ?? 0})
          </Button>
        )}
        {canReviewExemptions && (
          <Button
            type="button"
            variant={category === 'dues-exemptions' ? 'default' : 'outline'}
            onClick={() => selectCategory('dues-exemptions')}
          >
            Dues exemptions ({exemptions.data?.length ?? 0})
          </Button>
        )}
      </div>

      {category === 'new-members' && canReviewMembers ? (
        <NewMemberApprovals
          applications={applications.data ?? []}
          loading={applications.isLoading}
          loadError={applications.isError ? 'Could not load membership applications.' : null}
        />
      ) : (
        <DuesExemptionApprovals
          requests={exemptions.data ?? []}
          loading={exemptions.isLoading}
          loadError={exemptions.isError ? 'Could not load dues-exemption requests.' : null}
        />
      )}
    </div>
  )
}

function NewMemberApprovals({
  applications,
  loadError,
  loading,
}: {
  applications: Application[]
  loadError: string | null
  loading: boolean
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected =
    applications.find((application) => application.applicationId === selectedId) ?? applications[0]

  useEffect(() => {
    if (selected && selected.applicationId !== selectedId) setSelectedId(selected.applicationId)
  }, [selected, selectedId])

  if (loading) return <p className="text-muted-foreground">Loading applications…</p>
  if (loadError) return <ErrorAlert error={loadError} action="Load membership applications" />
  if (applications.length === 0) {
    return (
      <div className="rounded-lg border bg-muted p-8 text-center text-muted-foreground">
        No open membership applications.
      </div>
    )
  }

  function statusFor(application: Application) {
    if (application.reviewStatus.startsWith('approved_')) return 'Welcome email not sent'
    if (application.paymentStatus === 'reconciliation_required') return 'Payment outcome unknown'
    if (!application.requirementsComplete) return 'Waiting on applicant'
    return null
  }

  return (
    <div className="grid items-start gap-6 md:grid-cols-[16rem_minmax(0,1fr)] lg:grid-cols-[20rem_minmax(0,1fr)]">
      <div className="md:hidden">
        <Select value={selected?.applicationId ?? ''} onValueChange={setSelectedId}>
          <SelectTrigger aria-label="Selected application">
            <SelectValue placeholder="Select an application" />
          </SelectTrigger>
          <SelectContent>
            {applications.map((application) => {
              const status = statusFor(application)
              return (
                <SelectItem key={application.applicationId} value={application.applicationId}>
                  {application.firstName} {application.lastName}
                  {status ? ` · ${status}` : ''}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>
      <div className="hidden space-y-3 md:block">
        {applications.map((application) => {
          const active = application.applicationId === selected?.applicationId
          const status = statusFor(application)
          return (
            <Button
              key={application.applicationId}
              type="button"
              variant={active ? 'default' : 'outline'}
              onClick={() => setSelectedId(application.applicationId)}
              className="h-auto w-full justify-start whitespace-normal px-4 py-3 text-left"
            >
              <span>
                <span className="block font-semibold">
                  {application.firstName} {application.lastName}
                </span>
                {status && <span className="mt-1 block text-sm opacity-80">{status}</span>}
              </span>
            </Button>
          )
        })}
      </div>
      {selected && <ApplicationReview key={selected.applicationId} application={selected} />}
    </div>
  )
}

function ApplicationReview({ application }: { application: Application }) {
  const updateEmails = useUpdateMembershipApplicationEmailsMutation()
  const resend = useResendMembershipApplicationCompletionEmailMutation()
  const retryWelcome = useRetryMembershipApplicationWelcomeEmailMutation()
  const approveNew = useApproveNewMembershipApplicationMutation()
  const applyExisting = useApplyMembershipApplicationToExistingMemberMutation()
  const close = useCloseMembershipApplicationMutation()
  const [primaryEmail, setPrimaryEmail] = useState(application.primaryEmail)
  const [uwEmail, setUwEmail] = useState(application.uwEmail ?? '')
  const [selectedMember, setSelectedMember] = useState<number | null>(
    application.matches[0]?.wycNumber ?? null,
  )
  const [reviewAction, setReviewAction] = useState<ReviewAction>(null)
  const [closeNote, setCloseNote] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [emailSimulated, setEmailSimulated] = useState(false)
  const busy =
    updateEmails.isPending ||
    resend.isPending ||
    approveNew.isPending ||
    applyExisting.isPending ||
    close.isPending ||
    retryWelcome.isPending
  const approved = application.reviewStatus.startsWith('approved_')
  const paymentFollowUp = application.paymentStatus === 'reconciliation_required'
  const waitingOnApplicant =
    !approved && application.paymentStatus === 'completed' && !application.requirementsComplete
  const readyForApproval =
    !approved && application.paymentStatus === 'completed' && application.requirementsComplete

  async function saveEmails() {
    setError(null)
    setNotice(null)
    try {
      await updateEmails.mutateAsync({
        applicationId: application.applicationId,
        primaryEmail,
        uwEmail: uwEmail || null,
      })
      setNotice('Email addresses saved.')
    } catch (caught: any) {
      setError(caught?.message ?? 'Could not update the email addresses.')
    }
  }

  async function resendCompletion() {
    setError(null)
    setNotice(null)
    try {
      const result = (await resend.mutateAsync(application.applicationId)) as {
        emailSimulated?: boolean
      }
      setEmailSimulated(Boolean(result.emailSimulated))
      setNotice('Completion email sent.')
    } catch (caught: any) {
      setError(caught?.message ?? 'Could not send the completion email.')
    }
  }

  async function retryMembershipEmail() {
    setError(null)
    setNotice(null)
    try {
      const result = (await retryWelcome.mutateAsync(application.applicationId)) as {
        emailSimulated?: boolean
      }
      setEmailSimulated(Boolean(result.emailSimulated))
      setNotice('Membership email sent.')
    } catch (caught: any) {
      setError(caught?.message ?? 'Could not send the membership email.')
    }
  }

  async function confirmAction() {
    if (!reviewAction) return
    setError(null)
    setNotice(null)
    try {
      let result: unknown
      if (reviewAction.kind === 'approve-new') {
        result = await approveNew.mutateAsync({
          applicationId: application.applicationId,
          confirmPossibleMatches: application.matches.length > 0,
        })
      } else if (reviewAction.kind === 'apply-existing') {
        result = await applyExisting.mutateAsync({
          applicationId: application.applicationId,
          wycNumber: reviewAction.wycNumber,
        })
      } else {
        result = await close.mutateAsync({
          applicationId: application.applicationId,
          note: closeNote,
        })
      }
      const delivery = result as {
        emailSent?: boolean
        emailSimulated?: boolean
        wycNumber?: number
      }
      setEmailSimulated(Boolean(delivery.emailSimulated))
      setNotice(
        reviewAction.kind === 'close'
          ? 'Application closed.'
          : `Application approved as WYC member ${delivery.wycNumber}.`,
      )
      setReviewAction(null)
    } catch (caught: any) {
      setReviewAction(null)
      setError(caught?.message ?? 'Could not process the application.')
    }
  }

  const questionnaireAnswers = application.questionnaireResponses?.answers ?? []

  return (
    <div className="space-y-5 rounded-lg border p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            {application.firstName} {application.lastName}
          </h2>
          <p className="text-sm text-muted-foreground">
            Applied {new Date(application.createdAt).toLocaleDateString()} ·{' '}
            {application.targetLabel} · {application.tier}, {application.duration}
          </p>
        </div>
        {(approved || paymentFollowUp || waitingOnApplicant) && (
          <span className="rounded-full border bg-muted px-3 py-1 text-sm font-medium">
            {approved
              ? 'Welcome email not sent'
              : paymentFollowUp
                ? 'Payment outcome unknown'
                : 'Waiting on applicant'}
          </span>
        )}
      </div>

      <ErrorAlert error={error} action="Process membership application" />
      {notice && <div className="rounded-md border bg-muted p-3 text-sm">{notice}</div>}
      {emailSimulated && <EmailSimulatedNotice />}

      {application.matches.length > 0 && (
        <div className="rounded border border-yellow-400 bg-yellow-50 p-4 text-yellow-950">
          <div className="flex gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="font-semibold">Possible existing member</p>
                <p className="text-sm">Check this before creating a separate profile.</p>
              </div>
              {application.matches.map((match) => (
                <Button
                  key={match.wycNumber}
                  type="button"
                  variant={selectedMember === match.wycNumber ? 'default' : 'outline'}
                  onClick={() => setSelectedMember(match.wycNumber)}
                  className="h-auto w-full justify-start whitespace-normal px-3 py-2 text-left"
                >
                  {match.firstName} {match.lastName} (#{match.wycNumber}) ·{' '}
                  {match.reasons.join(', ')}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {paymentFollowUp && (
        <div className="rounded border border-yellow-400 bg-yellow-50 p-4 text-yellow-950">
          <p className="font-semibold">Square did not return a definite payment result.</p>
          <p className="mt-1 text-sm">
            Check order{' '}
            <span className="font-mono">{application.squareOrderId ?? 'not recorded'}</span> in
            Square before closing this application. It cannot be approved until the payment is
            confirmed and recorded.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t pt-5">
        {approved && (
          <Button type="button" onClick={retryMembershipEmail} disabled={busy}>
            {retryWelcome.isPending ? 'Sending…' : 'Send welcome email'}
          </Button>
        )}
        {waitingOnApplicant && (
          <Button type="button" onClick={resendCompletion} disabled={busy}>
            {resend.isPending ? 'Sending…' : 'Resend completion email'}
          </Button>
        )}
        {readyForApproval && (
          <Button
            type="button"
            onClick={() => setReviewAction({ kind: 'approve-new' })}
            disabled={busy}
          >
            Create member
          </Button>
        )}

        {!approved && (
          <Popover open={moreOpen} onOpenChange={setMoreOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="icon" aria-label="More actions">
                    <Ellipsis className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>More actions</TooltipContent>
            </Tooltip>
            <PopoverContent align="end" className="w-80 space-y-4">
              {readyForApproval && (
                <div className="space-y-3">
                  <p className="font-medium">Apply to an existing member</p>
                  <MemberCombobox
                    label="Existing member"
                    value={selectedMember}
                    onChange={setSelectedMember}
                    disabled={busy}
                    exactWycNumberSearch
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      if (!selectedMember) return
                      setMoreOpen(false)
                      setReviewAction({ kind: 'apply-existing', wycNumber: selectedMember })
                    }}
                    disabled={busy || selectedMember === null}
                  >
                    Apply to existing member
                  </Button>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setMoreOpen(false)
                  setReviewAction({ kind: 'close' })
                }}
                disabled={busy}
              >
                Close application
              </Button>
            </PopoverContent>
          </Popover>
        )}

        <Button
          type="button"
          variant="ghost"
          className="ml-auto"
          onClick={() => setDetailsOpen((open) => !open)}
        >
          {detailsOpen ? 'Hide details' : 'View details'}
          {detailsOpen ? (
            <ChevronUp className="ml-2 h-4 w-4" />
          ) : (
            <ChevronDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      </div>

      {detailsOpen && (
        <div className="space-y-7 border-t pt-5">
          <ReviewSection title="Application">
            <ReviewGrid
              rows={[
                ['UW status', application.uwStatus],
                [
                  'Resolved member',
                  application.resolvedWycNumber
                    ? `#${application.resolvedWycNumber}`
                    : 'Not resolved',
                ],
                ['Membership', `${application.tier}, ${application.duration}`],
                [
                  'Payment',
                  application.paymentAmountCents == null
                    ? paymentFollowUp
                      ? 'Outcome unknown'
                      : 'Not recorded'
                    : `$${(application.paymentAmountCents / 100).toFixed(2)}`,
                ],
                ['Square order', application.squareOrderId ?? 'Not recorded'],
                ['Square payment', application.squarePaymentId ?? 'Not recorded'],
                ['Phone', application.phone ?? 'Not submitted'],
                [
                  'Address',
                  [
                    application.addressLine1,
                    application.addressLine2,
                    application.city,
                    application.state,
                    application.zipCode,
                  ]
                    .filter(Boolean)
                    .join(', ') || 'Not submitted',
                ],
                [
                  'Emergency contact',
                  [
                    application.emergencyFirstName,
                    application.emergencyLastName,
                    application.emergencyRelationship,
                    application.emergencyPhone,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Not submitted',
                ],
                [
                  'Waiver',
                  application.waiverSignedAt
                    ? `Signed ${new Date(application.waiverSignedAt).toLocaleString()}`
                    : 'Not signed',
                ],
              ]}
            />
          </ReviewSection>

          {!approved && (
            <ReviewSection title="Email addresses">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="approval-primary-email">Primary email</Label>
                  <Input
                    id="approval-primary-email"
                    type="email"
                    value={primaryEmail}
                    onChange={(event) => setPrimaryEmail(event.target.value)}
                    disabled={busy}
                  />
                  {application.submittedPrimaryEmail !== application.primaryEmail && (
                    <p className="text-xs text-muted-foreground">
                      Submitted as {application.submittedPrimaryEmail}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="approval-uw-email">UW email</Label>
                  <Input
                    id="approval-uw-email"
                    type="email"
                    value={uwEmail}
                    onChange={(event) => setUwEmail(event.target.value)}
                    disabled={busy}
                  />
                </div>
              </div>
              <Button type="button" variant="outline" onClick={saveEmails} disabled={busy}>
                Save email changes
              </Button>
            </ReviewSection>
          )}

          {questionnaireAnswers.length > 0 && (
            <ReviewSection title="Questionnaire">
              <div className="space-y-4">
                {questionnaireAnswers.map((answer) => (
                  <div key={answer.questionId}>
                    <p className="text-sm font-medium">{answer.questionLabel}</p>
                    <p className="text-sm text-muted-foreground">
                      {answer.type === 'text'
                        ? answer.value
                        : answer.type === 'single_choice'
                          ? answer.selectedOption.label
                          : answer.selectedOptions.map((option) => option.label).join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            </ReviewSection>
          )}
        </div>
      )}

      <ReviewActionDialog
        action={reviewAction}
        applicantName={`${application.firstName} ${application.lastName}`}
        closeNote={closeNote}
        onCloseNoteChange={setCloseNote}
        onCancel={() => setReviewAction(null)}
        onConfirm={confirmAction}
        busy={busy}
        hasMatches={application.matches.length > 0}
      />
    </div>
  )
}

function ReviewActionDialog({
  action,
  applicantName,
  busy,
  closeNote,
  hasMatches,
  onCancel,
  onCloseNoteChange,
  onConfirm,
}: {
  action: ReviewAction
  applicantName: string
  busy: boolean
  closeNote: string
  hasMatches: boolean
  onCancel: () => void
  onCloseNoteChange: (value: string) => void
  onConfirm: () => void
}) {
  const title =
    action?.kind === 'approve-new'
      ? 'Create a new member?'
      : action?.kind === 'apply-existing'
        ? 'Apply to the selected member?'
        : 'Close this application?'
  const description =
    action?.kind === 'approve-new'
      ? hasMatches
        ? `${applicantName} has possible member matches. This will intentionally create a separate WYC profile.`
        : `This will create and activate a new WYC profile for ${applicantName}.`
      : action?.kind === 'apply-existing'
        ? `This will apply the payment, contact information, emergency contact, and membership expiry to WYC member ${action.wycNumber}.`
        : 'Closing preserves the application and payment record. Any refund must still be handled separately in Square.'

  return (
    <AlertDialog open={action !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {action?.kind === 'close' && (
          <div className="space-y-2">
            <Label htmlFor="application-close-note">Internal note (optional)</Label>
            <Textarea
              id="application-close-note"
              value={closeNote}
              onChange={(event) => onCloseNoteChange(event.target.value)}
              maxLength={1_000}
            />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={busy}>
            {busy
              ? 'Working…'
              : action?.kind === 'close'
                ? 'Close application'
                : 'Confirm approval'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function ReviewSection({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="space-y-4">
      <h3 className="border-b pb-2 text-lg font-semibold">{title}</h3>
      {children}
    </section>
  )
}

function ReviewGrid({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-sm font-medium">{label}</dt>
          <dd className="break-words text-sm text-muted-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

type ExemptionRequest = Awaited<ReturnType<typeof listPendingExemptionRequests>>[number]

function DuesExemptionApprovals({
  loadError,
  loading,
  requests,
}: {
  loadError: string | null
  loading: boolean
  requests: ExemptionRequest[]
}) {
  const approve = useApproveExemptionMutation()
  const deny = useDenyExemptionMutation()
  const [error, setError] = useState<string | null>(null)
  const busyId = approve.isPending ? approve.variables : deny.isPending ? deny.variables : null

  async function decide(action: 'approve' | 'deny', requestId: number) {
    setError(null)
    try {
      if (action === 'approve') await approve.mutateAsync(requestId)
      else await deny.mutateAsync(requestId)
    } catch (caught: any) {
      setError(caught?.message ?? 'Something went wrong. Please try again.')
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading requests…</p>
  if (loadError) return <ErrorAlert error={loadError} action="Load dues-exemption requests" />
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <ErrorAlert error={error} action="Decide exemption request" />
      {requests.length === 0 ? (
        <div className="rounded-lg border bg-muted p-8 text-center text-muted-foreground">
          No pending dues-exemption requests.
        </div>
      ) : (
        requests.map((request) => (
          <div
            key={request.index}
            className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"
          >
            <div className="space-y-1">
              <p className="font-semibold">
                {request.name || 'Unknown'}{' '}
                <span className="text-muted-foreground">#{request.wycNumber}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Requesting {request.requestedLabel} · paid through {request.currentLabel}
              </p>
              {!request.waiverComplete && (
                <p className="text-sm font-medium text-muted-foreground">Waiting for waiver</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busyId === request.index}
                onClick={() => decide('deny', request.index)}
              >
                Deny
              </Button>
              <Button
                type="button"
                disabled={busyId === request.index || !request.waiverComplete}
                onClick={() => decide('approve', request.index)}
              >
                {busyId === request.index ? 'Working…' : 'Approve'}
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
