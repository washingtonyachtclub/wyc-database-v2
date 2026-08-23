import { createFileRoute, Link, redirect, useNavigate, useRouter } from '@tanstack/react-router'
import { CheckoutBetaBanner } from '@/components/checkouts/CheckoutBetaBanner'
import { CheckoutForm } from '@/components/checkouts/CheckoutForm'
import { WindHistoryChart } from '@/components/checkouts/WindHistoryChart'
import { Button } from '@/components/ui/button'
import {
  getCheckoutFormBoatTypesQueryOptions,
  getCheckoutFormMembersQueryOptions,
  getMyRatingsQueryOptions,
} from '@/domains/checkouts/query-options'
import { useLogoutMutation } from '@/lib/auth/auth-query-options'

export const Route = createFileRoute('/checkout_/new')({
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: { redirect: '/checkout' },
      })
    }
  },
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(getCheckoutFormBoatTypesQueryOptions()),
      context.queryClient.ensureQueryData(getMyRatingsQueryOptions()),
      context.queryClient.ensureQueryData(getCheckoutFormMembersQueryOptions()),
    ]),
  head: () => ({ meta: [{ title: 'Check Out a Boat | WYC' }] }),
  component: NewCheckoutPage,
})

function NewCheckoutPage() {
  const { user, sailLockerMode } = Route.useRouteContext()
  const navigate = useNavigate()
  const router = useRouter()
  const logout = useLogoutMutation()

  const finishCheckout = async () => {
    if (sailLockerMode) {
      await logout.mutateAsync()
      await router.invalidate()
    }
    await navigate({ to: '/checkout' })
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <CheckoutBetaBanner />
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
        <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-4">
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl">Check Out a Boat</h1>
          {sailLockerMode && user ? (
            <div className="col-span-2 row-start-2 min-w-0 text-left sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:text-center">
              <p className="text-sm font-medium text-muted-foreground">Checking out a boat as</p>
              <p className="truncate text-xl font-bold sm:text-3xl">
                {user.first} {user.last}
              </p>
            </div>
          ) : (
            <div className="hidden sm:block" />
          )}
          <Button asChild variant="outline" className="col-start-2 row-start-1 h-11 sm:col-start-3">
            <Link to="/checkout">Back</Link>
          </Button>
        </div>
        <div className="mx-auto max-w-4xl">
          <WindHistoryChart />
        </div>
        <div className="mx-auto mt-4 max-w-2xl rounded-xl border bg-card p-3 shadow-sm sm:mt-5 sm:p-6">
          <CheckoutForm skipperWycNumber={user?.wycNumber ?? 0} onSuccess={finishCheckout} />
        </div>
      </div>
    </div>
  )
}
