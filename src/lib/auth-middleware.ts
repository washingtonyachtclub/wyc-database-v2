import { hasPrivilege } from './permissions'
import type { Privilege } from './permissions'
import { useAppSession } from './session'

/**
 * Middleware function to require authentication.
 * Throws an error if user is not authenticated.
 * Returns the user ID if authenticated.
 */
export async function requireAuth(): Promise<number> {
  const session = await useAppSession()
  const sessionData = session.data

  if (!sessionData.userId) {
    throw new Error('Unauthorized: No session found')
  }

  return sessionData.userId
}

/**
 * Server-side privilege check for server functions.
 * Reads privileges from the session cookie. Uses OR logic: user needs any one of the required privileges.
 * Returns the user ID if authorized. Throws if not authenticated or missing privilege.
 */
export async function requirePrivilege(...required: Privilege[]): Promise<number> {
  const session = await useAppSession()
  const sessionData = session.data

  if (!sessionData.userId) {
    throw new Error('Unauthorized: No session found')
  }

  if (required.length > 0) {
    const userPrivs = sessionData.privileges ?? []
    if (!hasPrivilege(userPrivs, required)) {
      throw new Error('Forbidden: Insufficient privileges')
    }
  }

  return sessionData.userId
}

/**
 * Middleware function for optional authentication.
 * Returns user ID if authenticated, null otherwise.
 */
export async function optionalAuth(): Promise<number | null> {
  const session = await useAppSession()
  const sessionData = session.data

  return sessionData.userId ?? null
}
