import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createRouter, useLocation } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import * as TanstackQuery from './integrations/tanstack-query/root-provider'
import { AdminContactModal } from './components/AdminContactModal'
import { CopyRow } from './components/ui/CopyRow'
import { getDatabaseAdmin } from './lib/officers-server-fns'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

function DefaultErrorFallback() {
  const location = useLocation()
  const [showAdminModal, setShowAdminModal] = useState(false)
  const { data: adminData } = useQuery({
    queryKey: ['databaseAdmin'],
    queryFn: () => getDatabaseAdmin(),
    staleTime: Infinity,
  })
  const timestamp = new Date().toLocaleString()
  const report = [`Time: ${timestamp}`, `Page: ${location.pathname}`].join('\n')

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">
        An unexpected error occurred. Try refreshing the page.
      </p>
      <div className="w-full max-w-sm">
        <CopyRow label="Error details" text={report} />
      </div>
      <p className="text-xs text-muted-foreground">
        If this problem persists, send the above details to the{' '}
        <button
          type="button"
          className="underline hover:text-foreground"
          onClick={() => setShowAdminModal(true)}
        >
          database administrator
        </button>
        .
      </p>
      {showAdminModal && adminData && (
        <AdminContactModal
          onClose={() => setShowAdminModal(false)}
          adminName={adminData.name}
          adminEmail={adminData.email}
        />
      )}
    </div>
  )
}

// Create a new router instance
export const getRouter = () => {
  const rqContext = TanstackQuery.getContext()

  const router = createRouter({
    routeTree,
    context: {
      ...rqContext,
      // Default auth state - will be populated by beforeLoad in root route
      user: null,
      isAuthenticated: false,
      privileges: [],
    },

    defaultPreload: 'intent',
    defaultErrorComponent: DefaultErrorFallback,
  })

  setupRouterSsrQueryIntegration({ router, queryClient: rqContext.queryClient })

  return router
}
