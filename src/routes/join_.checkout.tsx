import { ClubWordmark } from '@/components/ClubWordmark'
import { MembershipCheckout } from '@/components/renewals/MembershipCheckout'
import { Button } from '@/components/ui/button'
import { getCheckoutDraft } from '@/domains/membership-applications/server-fns'
import {
  newMemberPriceQueryOptions,
  useStartNewMemberPaymentMutation,
} from '@/domains/membership-applications/query-options'
import { tierForUwStatus } from '@/domains/renewals/questionnaire'
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/join_/checkout')({
  loader: async ({ context }) => {
    const draft = await getCheckoutDraft()
    if (!draft) return null
    if (draft.paymentStatus !== 'draft')
      throw redirect({
        to: '/join/$applicationId',
        params: { applicationId: draft.id },
        search: { embed: undefined, email: undefined, simulated: false },
      })
    const tier = tierForUwStatus(draft.questionnaire.uwStatus)
    const price = await context.queryClient.ensureQueryData(
      newMemberPriceQueryOptions(tier, draft.duration),
    )
    return { draft, tier, price }
  },
  headers: () => ({ 'Cache-Control': 'private, no-store' }),
  errorComponent: () => (
    <main className="mx-auto max-w-lg space-y-4 px-4 py-10">
      <ClubWordmark />
      <h1 className="text-2xl font-bold">Checkout could not load</h1>
      <p>Try again to load your membership details and price.</p>
      <Button onClick={() => window.location.reload()}>Try again</Button>
    </main>
  ),
  component: CheckoutPage,
})
function CheckoutPage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate()
  const payment = useStartNewMemberPaymentMutation()
  if (!data)
    return (
      <main className="mx-auto max-w-lg space-y-4 p-6">
        <ClubWordmark />
        <h1 className="text-2xl font-bold">Checkout unavailable</h1>
        <p>Start a signup to continue on this browser.</p>
        <Button asChild>
          <Link to="/join" search={{ embed: undefined }}>
            Membership signup
          </Link>
        </Button>
      </main>
    )
  const { draft, price, tier } = data
  return (
    <main className="mx-auto max-w-lg space-y-6 px-4 py-10">
      <ClubWordmark />
      <h1 className="font-wyc-heading text-3xl font-bold">Membership checkout</h1>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold capitalize">{draft.duration} membership</p>
          <p className="text-muted-foreground">Through {draft.targetLabel}</p>
        </div>
        <Button variant="link" asChild>
          <Link to="/join" search={{ edit: true, embed: undefined }}>
            Edit signup details
          </Link>
        </Button>
      </div>
      <MembershipCheckout
        audience="new_members"
        price={price}
        duration={draft.duration}
        tier={tier}
        onPay={async (sourceId, discount) => {
          const result = await payment.mutateAsync({
            ...draft,
            draftId: draft.id,
            sourceId,
            discountCode: discount ? { code: discount.code, revision: discount.revision } : null,
          })
          if (!result.success && (result.retryAllowed || !result.applicationId))
            throw new Error(result.message)
          await navigate({
            to: '/join/$applicationId',
            params: { applicationId: result.applicationId! },
            search: {
              embed: undefined,
              email: result.success ? (result.emailSent ? 'sent' : 'failed') : undefined,
              simulated: result.success && result.emailSimulated,
            },
            replace: true,
          })
        }}
      />
    </main>
  )
}
