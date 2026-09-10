import { redirect } from '@tanstack/react-router'
import { hasRouteAccess, routePermissions } from './permissions'
import type { Privilege, ProtectedRoute } from './permissions'

/**
 * Route-level access check for use in beforeLoad.
 * Redirects to /login if not authenticated, /forbidden if the route policy denies access.
 * Routes not in the registry are denied by default (fail-closed).
 *
 * This lives in its own file (not auth-middleware.ts) so that server function files
 * don't transitively import @tanstack/react-router.
 */
export function requirePrivilegeForRoute(
  context: {
    isAuthenticated: boolean
    privileges: Privilege[]
    user?: { wycNumber: number } | null
  },
  routePath: ProtectedRoute,
) {
  if (!context.isAuthenticated) {
    throw redirect({ to: '/login' })
  }

  const required = routePermissions[routePath]
  if (!required) {
    throw redirect({ to: '/forbidden' })
  }

  if (!hasRouteAccess(context.user?.wycNumber, context.privileges, routePath)) {
    throw redirect({ to: '/forbidden' })
  }
}
