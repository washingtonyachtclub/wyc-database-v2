import { useSession } from '@tanstack/react-start/server'
import type { Privilege } from '../permissions'
import { isSailLockerMode } from './device-mode'
import { loadAuthUser, loadUserPrivileges, type AuthUser } from './identity'
import { getSessionMaxAgeSeconds, shouldRefreshIdentity } from './session-policy'

export type SessionIdentity = {
  userId: number
  user: AuthUser
  privileges: Privilege[]
}

export type SessionData = {
  userId?: number
  user?: AuthUser
  privileges?: Privilege[]
  privilegesRefreshedAt?: number
  expiresAt?: number
  /** Saved when dev-emulating. Stores the real logged-in user's identity. */
  realIdentity?: SessionIdentity
}

/**
 * Get the app session using TanStack Start's useSession
 * This provides encrypted HTTP-only cookie sessions
 */
export function useAppSession() {
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is not set')
  }
  const maxAge = getSessionMaxAgeSeconds(isSailLockerMode())

  return useSession<SessionData>({
    name: 'wyc_session',
    password: process.env.SESSION_SECRET,
    maxAge,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      httpOnly: true,
      path: '/',
    },
  })
}

export function createAuthenticatedSessionData(
  user: AuthUser,
  privileges: Privilege[],
): SessionData {
  const now = Date.now()

  return {
    userId: user.wycNumber,
    user,
    privileges,
    privilegesRefreshedAt: now,
    expiresAt: now + getSessionMaxAgeSeconds(isSailLockerMode()) * 1000,
  }
}

export async function useRefreshedAppSession() {
  const session = await useAppSession()
  const sessionData = session.data

  if (
    !sessionData.userId ||
    sessionData.realIdentity ||
    !shouldRefreshIdentity(sessionData.privilegesRefreshedAt)
  ) {
    return session
  }

  let user: AuthUser | null
  let privileges: Privilege[]

  try {
    const refreshedIdentity = await Promise.all([
      loadAuthUser(sessionData.userId),
      loadUserPrivileges(sessionData.userId),
    ])
    user = refreshedIdentity[0]
    privileges = refreshedIdentity[1]
  } catch (error) {
    console.error('Failed to refresh session identity:', error)
    throw new Error('Failed to refresh session')
  }

  if (!user) {
    await session.clear()
    return session
  }

  const now = Date.now()
  await session.update({
    user,
    privileges,
    privilegesRefreshedAt: now,
    expiresAt: sessionData.expiresAt ?? now + getSessionMaxAgeSeconds(isSailLockerMode()) * 1000,
  })

  return session
}
