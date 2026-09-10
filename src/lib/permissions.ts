import { DATABASE_ADMIN_WYC_NUMBER } from '@/db/constants'

export type Privilege = 'db' | 'rtgs'

/**
 * Single source of truth for route access control.
 *
 * Every route must be listed. An empty array means "any authenticated user."
 * A non-empty array uses OR logic: user needs ANY ONE of the listed privileges.
 * Routes NOT in this map are denied by default (fail-closed).
 */
export const routePermissions = {
  '/': [],
  '/members': ['db', 'rtgs'], // rtgs sees the roster read-only; no email export
  '/members/$wycNumber': ['db', 'rtgs'], // own-profile exception handled in route beforeLoad
  '/lessons': ['db', 'rtgs'],
  '/lessons/$lessonIndex': [], // auth only; server functions enforce per-lesson instructor-or-db access
  '/my-lessons': [],
  '/my-lessons/$lessonIndex': [],
  '/door-codes': [], // auth only; the server function filters codes by ratings
  '/maintenance-tracker': [],
  '/ratings': ['rtgs'],
  '/ratings/$ratingIndex': ['rtgs'],
  '/rating-types': ['db', 'rtgs'],
  '/chiefs': [],
  '/officers': ['db'],
  '/privileges': ['db'],
  '/honorary': ['db'],
  '/boat-types': ['db'],
  '/checkout/new': [],
  '/checkouts': ['db', 'rtgs'],
  '/lesson-types': ['db'],
  '/quarters': ['db'],
  '/positions': ['db'],
  '/ratings-examiners': ['db'],
  '/membership-processing': ['db'],
  '/membership-approvals': ['db'],
  '/membership-stats': ['db'],
  '/set-current-quarter': ['db'],
  '/tests': [],
  '/set-password': [],
  '/settings': [],
  '/forbidden': [],
} as const satisfies Record<string, readonly Privilege[]>

export type ProtectedRoute = keyof typeof routePermissions

// The approval workflow is limited to the database administrator during beta.
const routeWycNumberRestrictions: Partial<Record<ProtectedRoute, readonly number[]>> = {
  '/membership-approvals': [DATABASE_ADMIN_WYC_NUMBER],
}

/**
 * Check if a user has any of the required privileges (OR logic).
 * Returns true if required is empty (no privilege needed).
 */
export function hasPrivilege(
  userPrivileges: readonly Privilege[],
  required: readonly Privilege[],
): boolean {
  if (required.length === 0) return true
  return required.some((p) => userPrivileges.includes(p))
}

export function hasRoutePrivilegeAccess(
  userPrivileges: readonly Privilege[],
  route: ProtectedRoute,
): boolean {
  return hasPrivilege(userPrivileges, routePermissions[route])
}

export function hasRouteAccess(
  wycNumber: number | null | undefined,
  userPrivileges: readonly Privilege[],
  route: ProtectedRoute,
): boolean {
  const allowedWycNumbers = routeWycNumberRestrictions[route]
  if (!hasRoutePrivilegeAccess(userPrivileges, route)) return false
  if (!allowedWycNumbers) return true
  return typeof wycNumber === 'number' && allowedWycNumbers.includes(wycNumber)
}
