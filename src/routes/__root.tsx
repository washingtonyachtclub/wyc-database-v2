import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  useLocation,
} from '@tanstack/react-router'

import Header from '../components/Header'
import { MembershipApprovalsBanner } from '../components/MembershipApprovalsBanner'
import { MembershipBanner } from '../components/MembershipBanner'
import { QuarterMaintenanceBanner } from '../components/QuarterMaintenanceBanner'
import { SailLockerCheckoutSessionGuard } from '../components/SailLockerCheckoutSessionGuard'
import Sidebar from '../components/Sidebar'
import { TanStackDevTools } from '../components/TanStackDevTools'
import { TooltipProvider } from '../components/ui/tooltip'

import { Analytics } from '@vercel/analytics/react'
import appCss from '../styles.css?url'

import { getCurrentUserQueryOptions } from '@/lib/auth/auth-query-options'
import type { AuthUser } from '@/lib/auth/identity'
import type { QueryClient } from '@tanstack/react-query'
import type { Privilege } from '../lib/permissions'

interface MyRouterContext {
  queryClient: QueryClient
  user: AuthUser | null
  isAuthenticated: boolean
  privileges: Privilege[]
  sailLockerMode: boolean
  sessionExpiresAt?: number
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async ({ context }) => {
    const authResult = await context.queryClient.ensureQueryData(getCurrentUserQueryOptions())
    return {
      user: authResult.isValid ? authResult.user : null,
      isAuthenticated: authResult.isValid,
      privileges: authResult.privileges ?? [],
      sailLockerMode: authResult.sailLockerMode,
      sessionExpiresAt: authResult.sessionExpiresAt,
    }
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'WYC Database',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        type: 'image/png',
        href: '/favicon.png',
      },
    ],
  }),

  shellComponent: RootDocument,

  notFoundComponent: NotFound,
})

function NotFound() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
    </div>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { sailLockerMode } = Route.useRouteContext()
  const isEmbeddedPage =
    location.pathname === '/lesson-list' || location.pathname === '/meet-the-team'
  const isCheckoutPage =
    location.pathname === '/checkout' || location.pathname.startsWith('/checkout/')
  const isSailLockerCheckout = isCheckoutPage && sailLockerMode
  const loginRedirect =
    typeof location.search.redirect === 'string' ? location.search.redirect : undefined
  const isSailLockerCheckoutLogin =
    location.pathname === '/login' &&
    sailLockerMode &&
    (loginRedirect === '/checkout' || loginRedirect?.startsWith('/checkout/') === true)
  const isQrLoginApproval = location.pathname === '/qr-login/approve'
  const isGuestWaiverPage = location.pathname === '/guest-waiver'
  const isJoinPage = location.pathname === '/join' || location.pathname.startsWith('/join/')
  const isStandalonePage =
    ['/login', '/forgot-password', '/guest-waiver'].includes(location.pathname) ||
    isJoinPage ||
    location.pathname.startsWith('/signup') ||
    isQrLoginApproval ||
    isSailLockerCheckout
  const showAppHeader =
    !isSailLockerCheckout &&
    !isSailLockerCheckoutLogin &&
    !isQrLoginApproval &&
    !isGuestWaiverPage &&
    !isJoinPage
  const showAppLayout = !isStandalonePage
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {isEmbeddedPage ? (
          children
        ) : (
          <TooltipProvider delayDuration={0}>
            {showAppHeader && <Header />}
            {isSailLockerCheckout && <SailLockerCheckoutSessionGuard />}
            {showAppLayout && <MembershipBanner />}
            {showAppLayout && <MembershipApprovalsBanner />}
            {showAppLayout && <QuarterMaintenanceBanner />}
            {showAppLayout ? (
              <div className="flex">
                <Sidebar />
                <main className="flex-1">{children}</main>
              </div>
            ) : (
              children
            )}
            <TanStackDevTools />
          </TooltipProvider>
        )}
        <Scripts />
        <Analytics />
      </body>
    </html>
  )
}
