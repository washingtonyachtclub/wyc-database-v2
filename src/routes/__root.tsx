import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  useLocation,
} from '@tanstack/react-router'

import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import { TanStackDevTools } from '../components/TanStackDevTools'
import { TooltipProvider } from '../components/ui/tooltip'

import appCss from '../styles.css?url'

import { getCurrentUserServerFn } from '../lib/auth-server-fns'
import type { AuthUser } from '../lib/auth-server-fns'
import type { QueryClient } from '@tanstack/react-query'
import type { Privilege } from '../lib/permissions'

interface MyRouterContext {
  queryClient: QueryClient
  user: AuthUser | null
  isAuthenticated: boolean
  privileges: Privilege[]
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async () => {
    // Fetch current user to populate context
    const authResult = await getCurrentUserServerFn()
    return {
      user: authResult.isValid ? authResult.user : null,
      isAuthenticated: authResult.isValid,
      privileges: authResult.privileges ?? [],
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
  const isEmbedPage = location.pathname === '/lesson-list'
  const isBarePage =
    ['/login', '/forgot-password'].includes(location.pathname) ||
    location.pathname.startsWith('/signup')

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {isEmbedPage ? (
          children
        ) : (
          <TooltipProvider delayDuration={0}>
            <Header />
            {!isBarePage && (
              <div className="flex">
                <Sidebar />
                <main className="flex-1">{children}</main>
              </div>
            )}
            {isBarePage && children}
            <TanStackDevTools />
          </TooltipProvider>
        )}
        <Scripts />
      </body>
    </html>
  )
}
