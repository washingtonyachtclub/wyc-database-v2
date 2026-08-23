import { createFileRoute, Link, redirect, useNavigate, useRouter } from '@tanstack/react-router'
import { CheckoutBetaBanner } from '@/components/checkouts/CheckoutBetaBanner'
import { CheckoutForm } from '@/components/checkouts/CheckoutForm'
import { WindHistoryChart } from '@/components/checkouts/WindHistoryChart'
import { Button } from '@/components/ui/button'
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
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 grid grid-cols-[auto_1fr_auto] items-center gap-4">
          <h1 className="text-3xl font-bold">Check Out a Boat</h1>
          {sailLockerMode && user ? (
            <div className="min-w-0 text-center">
              <p className="text-sm font-medium text-muted-foreground">Checking out a boat as</p>
              <p className="truncate text-2xl font-bold sm:text-3xl">
                {user.first} {user.last}
              </p>
            </div>
          ) : (
            <div />
          )}
          <Button asChild variant="outline">
            <Link to="/checkout">Back</Link>
          </Button>
        </div>
        <div className="mx-auto max-w-4xl">
          <WindHistoryChart />
        </div>
        <div className="mx-auto mt-5 max-w-2xl rounded-xl border bg-card p-4 shadow-sm sm:p-6">
          <CheckoutForm skipperWycNumber={user?.wycNumber ?? 0} onSuccess={finishCheckout} />
        </div>
      </div>
    </div>
  )
}
