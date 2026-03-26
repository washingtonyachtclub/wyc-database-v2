import { redirect } from '@tanstack/react-router'
import { hasPrivilege, routePermissions } from './permissions'
import type { Privilege, ProtectedRoute } from './permissions'

/**
 * Route-level privilege check for use in beforeLoad.
 * Looks up the route in the permission registry and checks against context.privileges.
 * Redirects to /login if not authenticated, /forbidden if missing privilege.
 * Routes not in the registry are denied by default (fail-closed).
 *
 * This lives in its own file (not auth-middleware.ts) so that server function files
 * don't transitively import @tanstack/react-router.
 */
export function requirePrivilegeForRoute(
  context: { isAuthenticated: boolean; privileges: Privilege[] },
  routePath: ProtectedRoute,
) {
  if (!context.isAuthenticated) {
    throw redirect({ to: '/login' })
  }

  const required = routePermissions[routePath]
  if (!required) {
    throw redirect({ to: '/forbidden' })
  }

  if (!hasPrivilege(context.privileges, required)) {
    throw redirect({ to: '/forbidden' })
  }
}
