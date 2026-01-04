import { useSession } from '@tanstack/react-start/server'
import type { AuthUser } from './auth-server-fns'

export type SessionData = {
  userId?: number
  user?: AuthUser
}

/**
 * Get the app session using TanStack Start's useSession
 * This provides encrypted HTTP-only cookie sessions
 */
export function useAppSession() {
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is not set')
  }
  return useSession<SessionData>({
    name: 'wyc_session',
    password: process.env.SESSION_SECRET,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      httpOnly: true,
      maxAge: 3600, // 1 hour in seconds
      path: '/',
    },
  })
}
