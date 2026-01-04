import { useAppSession } from './session'

/**
 * Middleware function to require authentication
 * Throws an error if user is not authenticated
 * Returns the user ID if authenticated
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
 * Middleware function for optional authentication
 * Returns user ID if authenticated, null otherwise
 * Does not throw errors
 */
export async function optionalAuth(): Promise<number | null> {
  const session = await useAppSession()
  const sessionData = session.data

  return sessionData.userId ?? null
}
