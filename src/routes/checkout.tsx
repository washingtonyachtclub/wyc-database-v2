import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { CheckoutBetaBanner } from '@/components/checkouts/CheckoutBetaBanner'
import { CheckoutCard } from '@/components/checkouts/CheckoutCard'
import { CheckoutHistoryTable } from '@/components/checkouts/CheckoutHistoryTable'
import { WindHistoryChart } from '@/components/checkouts/WindHistoryChart'
import { Button } from '@/components/ui/button'
import { getCheckoutCardsQueryOptions } from '@/domains/checkouts/query-options'
import { useLogoutMutation } from '@/lib/auth/auth-query-options'

export const Route = createFileRoute('/checkout')({
  loader: ({ context }) => context.queryClient.ensureQueryData(getCheckoutCardsQueryOptions()),
  head: () => ({ meta: [{ title: 'WYC Boat Checkouts' }] }),
  component: CheckoutPage,
})

function CheckoutPage() {
  const { data } = useSuspenseQuery(getCheckoutCardsQueryOptions())
  const { user, isAuthenticated, sailLockerMode } = Route.useRouteContext()
  const logout = useLogoutMutation()
  const navigate = useNavigate()
  const router = useRouter()
  const [showWindHistory, setShowWindHistory] = useState(false)

  const finishSailLockerAction = async () => {
    if (!sailLockerMode) return
    await logout.mutateAsync()
    await router.invalidate()
    await navigate({ to: '/checkout' })
  }

  const switchSailLockerUser = async () => {
    await logout.mutateAsync()
    window.location.assign('/login?redirect=%2Fcheckout')
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <CheckoutBetaBanner />
      <div className="mx-auto max-w-6xl space-y-7 px-3 py-4 sm:space-y-8 sm:px-4 sm:py-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-3 sm:flex sm:flex-wrap sm:items-center sm:space-y-0 sm:gap-x-5 sm:gap-y-3">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <img src="/favicon.png" alt="WYC" className="h-10 w-10 shrink-0 sm:h-12 sm:w-12" />
              <h1 className="text-2xl font-bold leading-tight sm:text-3xl">WYC Boat Checkouts</h1>
            </div>
            {sailLockerMode && isAuthenticated && user && (
              <div className="sm:border-l sm:pl-5">
                <p className="text-sm font-medium text-muted-foreground">Checking out a boat as</p>
                <p className="truncate text-xl font-bold sm:text-3xl">
                  {user.first} {user.last}
                </p>
              </div>
            )}
          </div>
          <div className="grid w-full shrink-0 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:gap-3">
            <Button
              variant="outline"
              size="lg"
              className="h-11 w-full px-4 text-base sm:h-12 sm:w-auto sm:px-7"
              onClick={() => setShowWindHistory((visible) => !visible)}
            >
              {showWindHistory ? "Hide Today's Wind" : "Show Today's Wind"}
            </Button>
            {isAuthenticated ? (
              <>
                <Button
                  asChild
                  size="lg"
                  className="h-11 w-full px-4 text-base sm:h-12 sm:w-auto sm:px-7"
                >
                  <Link to="/checkout/new">Check Out a Boat</Link>
                </Button>
                {sailLockerMode && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-11 w-full px-4 text-base sm:h-12 sm:w-auto sm:px-7"
                    disabled={logout.isPending}
                    onClick={switchSailLockerUser}
                  >
                    {logout.isPending ? 'Signing out...' : 'Log In as a Different User'}
                  </Button>
                )}
              </>
            ) : (
              <Button
                asChild
                size="lg"
                className="h-11 w-full px-4 text-base sm:h-12 sm:w-auto sm:px-7"
              >
                <Link to="/login" search={{ redirect: '/checkout' }}>
                  Log In to Check Out / Check In
                </Link>
              </Button>
            )}
          </div>
        </header>

        {showWindHistory && (
          <div className="mx-auto w-full max-w-4xl">
            <WindHistoryChart />
          </div>
        )}

        <section>
          <h2 className="mb-3 text-xl font-semibold sm:text-2xl">Boats actively checked out</h2>
          {data.active.length === 0 ? (
            <div className="rounded-xl border bg-card p-6 text-muted-foreground shadow-sm">
              No boats are currently checked out.
            </div>
          ) : (
            <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.active.map((checkout) => (
                <CheckoutCard
                  key={checkout.index}
                  checkout={checkout}
                  onCheckedIn={sailLockerMode ? finishSailLockerAction : undefined}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold sm:text-2xl">Boats recently back in</h2>
          {data.returned.length === 0 ? (
            <div className="rounded-xl border bg-card p-6 text-muted-foreground shadow-sm">
              Checkout history is empty.
            </div>
          ) : (
            <CheckoutHistoryTable checkouts={data.returned} />
          )}
        </section>
      </div>
    </div>
  )
}
