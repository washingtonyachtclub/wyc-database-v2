import { canManageLesson, canManageRating } from '../resource-permissions'
import { eq } from 'drizzle-orm'
import { lessons, wycRatings } from '@/db/schema'
import db from '@/db/index'
import { hasPrivilege, hasRouteAccess } from '../permissions'
import type { Privilege, ProtectedRoute } from '../permissions'
import { useRefreshedAppSession } from './session'

/**
 * Middleware function to require authentication.
 * Throws an error if user is not authenticated.
 * Returns the user ID if authenticated.
 */
export async function requireAuth(): Promise<number> {
  const session = await useRefreshedAppSession()
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
  const session = await useRefreshedAppSession()
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

export async function requireRouteAccess(route: ProtectedRoute): Promise<number> {
  const session = await useRefreshedAppSession()
  const sessionData = session.data

  if (!sessionData.userId) {
    throw new Error('Unauthorized: No session found')
  }

  if (!hasRouteAccess(sessionData.userId, sessionData.privileges ?? [], route)) {
    throw new Error('Forbidden: Insufficient privileges')
  }

  return sessionData.userId
}

/**
 * Allows access if the authenticated user matches targetWycNumber (own data),
 * OR if the user has any of the required privileges.
 * Returns the authenticated user ID.
 */
export async function requireSelfOrPrivilege(
  targetWycNumber: number,
  ...required: Privilege[]
): Promise<number> {
  const session = await useRefreshedAppSession()
  const sessionData = session.data

  if (!sessionData.userId) {
    throw new Error('Unauthorized: No session found')
  }

  // Own data — always allowed
  if (sessionData.userId === targetWycNumber) {
    return sessionData.userId
  }

  // Someone else's data — need privilege
  if (required.length > 0) {
    const userPrivs = sessionData.privileges ?? []
    if (!hasPrivilege(userPrivs, required)) {
      throw new Error('Forbidden: Insufficient privileges')
    }
  }

  return sessionData.userId
}

/**
 * Check if the current session has any of the given privileges.
 * Does not throw — returns a boolean. Requires an active session.
 */
export async function sessionHasPrivilege(...required: Privilege[]): Promise<boolean> {
  const session = await useRefreshedAppSession()
  const userPrivs = session.data.privileges ?? []
  return hasPrivilege(userPrivs, required)
}

export async function requireLessonManagement(lessonIndex: number): Promise<number> {
  const session = await useRefreshedAppSession()
  if (!session.data.userId) throw new Error('Unauthorized: No session found')

  const [lesson] = await db
    .select({ instructor1: lessons.instructor1, instructor2: lessons.instructor2 })
    .from(lessons)
    .where(eq(lessons.index, lessonIndex))
    .limit(1)

  if (!lesson) throw new Error('Not found: Lesson does not exist')
  if (!canManageLesson(session.data, lesson)) throw new Error('Forbidden: Insufficient privileges')
  return session.data.userId
}

export async function requireRatingManagement(ratingIndex: number): Promise<number> {
  const session = await useRefreshedAppSession()
  if (!session.data.userId) throw new Error('Unauthorized: No session found')

  const [rating] = await db
    .select({ examiner: wycRatings.examiner, enteredBy: wycRatings.enteredBy })
    .from(wycRatings)
    .where(eq(wycRatings.index, ratingIndex))
    .limit(1)

  if (!rating || !canManageRating(session.data, rating)) {
    throw new Error('Forbidden: Insufficient privileges')
  }
  return session.data.userId
}

/**
 * Middleware function for optional authentication.
 * Returns user ID if authenticated, null otherwise.
 */
export async function optionalAuth(): Promise<number | null> {
  const session = await useRefreshedAppSession()
  const sessionData = session.data

  return sessionData.userId ?? null
}
