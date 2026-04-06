export type Privilege = 'db' | 'rtgs'

/**
 * Permission registry — single source of truth for route access control.
 *
 * Every route must be listed. An empty array means "any authenticated user."
 * A non-empty array uses OR logic: user needs ANY ONE of the listed privileges.
 * Routes NOT in this map are denied by default (fail-closed).
 */
export const routePermissions = {
  '/': [],
  '/members': ['db'],
  '/members/$wycNumber': ['db'], // own-profile exception handled in route beforeLoad
  '/lessons': ['db'],
  '/lessons/$lessonIndex': [], // auth only; server functions enforce per-lesson instructor-or-db access
  '/my-lessons': [],
  '/ratings': ['rtgs'],
  '/ratings/$ratingIndex': ['rtgs'],
  '/rating-types': ['db', 'rtgs'],
  '/chiefs': ['db'],
  '/officers': ['db'],
  '/privileges': ['db'],
  '/honorary': ['db'],
  '/boat-types': ['db'],
  '/class-types': ['db'],
  '/quarters': ['db'],
  '/positions': ['db'],
  '/membership-processing': ['db'],
  '/set-current-quarter': ['db'],
  '/set-password': [],
  '/forbidden': [],
} as const satisfies Record<string, readonly Privilege[]>

export type ProtectedRoute = keyof typeof routePermissions

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

