import { createServerFn } from '@tanstack/react-start'
import { and, count, eq, gte, or } from 'drizzle-orm'
import db from 'src/db/index'
import {
  lessonQuarter,
  lessons,
  officers,
  posPrivMap,
  privs,
  wycDatabase,
} from 'src/db/schema'
import { hashPasswordArgon2, verifyPasswordDual } from './auth'
import { requirePrivilege } from './auth-middleware'
import type { Privilege } from './permissions'
import { useAppSession, type SessionData } from './session'

export type AuthUser = {
  wycNumber: number
  first: string | null
  last: string | null
  email: string | null
}

export type LoginResponse = {
  success: boolean
  message: string
  user?: AuthUser
}

export type LogoutResponse = {
  success: boolean
  message: string
}

export type CurrentUserResponse = {
  isValid: boolean
  user?: AuthUser
  privileges?: Privilege[]
}

/**
 * Load a user's privileges from the officers → positions → pos_priv_map → privs chain,
 * plus the dynamic "instr" check against the lessons table.
 */
async function loadUserPrivileges(wycNumber: number): Promise<Privilege[]> {
  // 1. Get privileges from officer positions
  const privRows = await db
    .selectDistinct({ name: privs.name })
    .from(officers)
    .innerJoin(posPrivMap, eq(officers.position, posPrivMap.position))
    .innerJoin(privs, eq(posPrivMap.priv, privs.index))
    .where(and(eq(officers.member, wycNumber), eq(officers.active, 1)))

  const userPrivileges: Privilege[] = privRows
    .map((r) => r.name?.trim())
    .filter((name): name is Privilege => name === 'db' || name === 'rtgs')

  // 2. Dynamic "rtgs" grant — instructors for current-quarter lessons get ratings access
  const quarterRow = await db
    .select({ quarter: lessonQuarter.quarter })
    .from(lessonQuarter)
    .where(eq(lessonQuarter.index, 1))
    .limit(1)

  if (quarterRow.length > 0) {
    const currentQtr = quarterRow[0].quarter
    const instrRows = await db
      .select({ n: count() })
      .from(lessons)
      .where(
        and(
          or(eq(lessons.instructor1, wycNumber), eq(lessons.instructor2, wycNumber)),
          gte(lessons.expire, currentQtr),
        ),
      )

    if (instrRows[0].n > 0 && !userPrivileges.includes('rtgs')) {
      userPrivileges.push('rtgs')
    }
  }

  return userPrivileges
}

/**
 * Login server function
 * Validates credentials and creates a session
 */
export const loginServerFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { wycNumber: number; password: string }) => {
    if (!input.wycNumber || !input.password) {
      throw new Error('WYC Number and password are required')
    }
    return {
      wycNumber: Number(input.wycNumber),
      password: String(input.password),
    }
  })
  .handler(async ({ data }) => {
    try {
      const users = await db
        .select({
          wycNumber: wycDatabase.wycNumber,
          first: wycDatabase.first,
          last: wycDatabase.last,
          email: wycDatabase.email,
          password: wycDatabase.password,
          passwordArgon2: wycDatabase.passwordArgon2,
        })
        .from(wycDatabase)
        .where(eq(wycDatabase.wycNumber, data.wycNumber))
        .limit(1)

      if (users.length === 0) {
        return {
          success: false,
          message: 'Invalid WYC Number or password',
        } satisfies LoginResponse
      }

      const user = users[0]

      const { valid, needsUpgrade } = await verifyPasswordDual(
        data.password,
        user.password,
        user.passwordArgon2,
      )

      if (!valid) {
        return {
          success: false,
          message: 'Invalid WYC Number or password',
        } satisfies LoginResponse
      }

      if (needsUpgrade) {
        const argon2Hash = await hashPasswordArgon2(data.password)
        await db
          .update(wycDatabase)
          .set({ passwordArgon2: argon2Hash })
          .where(eq(wycDatabase.wycNumber, user.wycNumber))
      }

      const session = await useAppSession()
      const userData: AuthUser = {
        wycNumber: user.wycNumber,
        first: user.first,
        last: user.last,
        email: user.email,
      }
      const privileges = await loadUserPrivileges(user.wycNumber)

      await session.update({
        userId: user.wycNumber,
        user: userData,
        privileges,
      })

      return {
        success: true,
        message: 'Login successful',
        user: userData,
      } satisfies LoginResponse
    } catch (error: any) {
      console.error('Login error:', error)
      return {
        success: false,
        message: 'An error occurred during login',
      } satisfies LoginResponse
    }
  })

export const hashPasswordArgon2ServerFn = createServerFn({ method: 'POST' })
  .inputValidator((input: string) => input)
  .handler(async ({ data }) => {
    await requirePrivilege('db')
    return hashPasswordArgon2(data)
  })

/**
 * Logout server function
 * Deletes session and clears cookie
 */
export const logoutServerFn = createServerFn({ method: 'POST' }).handler(
  async () => {
    try {
      const session = await useAppSession()
      await session.clear()

      return {
        success: true,
        message: 'Logout successful',
      } satisfies LogoutResponse
    } catch (error: any) {
      console.error('Logout error:', error)
      return {
        success: false,
        message: 'An error occurred during logout',
      } satisfies LogoutResponse
    }
  },
)

/**
 * Get current user server function
 * Validates session and returns user info if authenticated
 */
export const getCurrentUserServerFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    try {
      const session = await useAppSession()
      const sessionData = session.data

      if (!sessionData.userId || !sessionData.user) {
        return {
          isValid: false,
        } satisfies CurrentUserResponse
      }

      return {
        isValid: true,
        user: sessionData.user,
        privileges: sessionData.privileges ?? [],
      } satisfies CurrentUserResponse
    } catch (error: any) {
      console.error('Get current user error:', error)
      return {
        isValid: false,
      } satisfies CurrentUserResponse
    }
  },
)

/**
 * DEV ONLY: Override the current session's privileges for testing RBAC.
 * Pass null to clear the override and restore real privileges.
 */
export const setDevPrivilegesServerFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { privileges: Privilege[] | null }) => input)
  .handler(async ({ data }) => {
    const isDevEnv = process.env.NODE_ENV === 'development' || process.env.VITE_APP_ENV === 'dev'
    if (!isDevEnv) {
      throw new Error('Dev privilege override is only available in development')
    }
    await requirePrivilege('db')

    const session = await useAppSession()
    const sessionData = session.data

    if (!sessionData.userId || !sessionData.user) {
      throw new Error('Not authenticated')
    }

    if (data.privileges === null) {
      // Restore privileges for current identity (may be emulated member)
      const currentUserId = sessionData.userId!
      const realPrivileges = await loadUserPrivileges(currentUserId)
      await session.update({
        ...sessionData,
        privileges: realPrivileges,
      } satisfies SessionData)
      return { privileges: realPrivileges }
    }

    await session.update({
      ...sessionData,
      privileges: data.privileges,
    } satisfies SessionData)
    return { privileges: data.privileges }
  })

/**
 * DEV ONLY: Emulate a different member (full impersonation).
 * Overrides session userId, user, and privileges.
 * Pass null to restore the original identity.
 */
export const setDevMemberServerFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { wycNumber: number | null }) => input)
  .handler(async ({ data }) => {
    const isDevEnv = process.env.NODE_ENV === 'development' || process.env.VITE_APP_ENV === 'dev'
    if (!isDevEnv) {
      throw new Error('Dev member emulation is only available in development')
    }
    await requirePrivilege('db')

    const session = await useAppSession()
    const sessionData = session.data

    if (!sessionData.userId || !sessionData.user) {
      throw new Error('Not authenticated')
    }

    if (data.wycNumber === null) {
      // Restore original identity
      if (!sessionData.realUserId || !sessionData.realUser) {
        return { user: sessionData.user, privileges: sessionData.privileges ?? [] }
      }
      const realPrivileges = await loadUserPrivileges(sessionData.realUserId)
      await session.update({
        userId: sessionData.realUserId,
        user: sessionData.realUser,
        privileges: realPrivileges,
        realUserId: undefined,
        realUser: undefined,
      } satisfies SessionData)
      return { user: sessionData.realUser, privileges: realPrivileges }
    }

    // Look up target member
    const [targetRow] = await db
      .select({
        wycNumber: wycDatabase.wycNumber,
        first: wycDatabase.first,
        last: wycDatabase.last,
        email: wycDatabase.email,
      })
      .from(wycDatabase)
      .where(eq(wycDatabase.wycNumber, data.wycNumber))
      .limit(1)

    if (!targetRow) {
      throw new Error(`Member ${data.wycNumber} not found`)
    }

    const targetUser: AuthUser = {
      wycNumber: targetRow.wycNumber,
      first: targetRow.first,
      last: targetRow.last,
      email: targetRow.email,
    }
    const targetPrivileges = await loadUserPrivileges(targetRow.wycNumber)

    // Save real identity if not already emulating
    const realUserId = sessionData.realUserId ?? sessionData.userId
    const realUser = sessionData.realUser ?? sessionData.user

    await session.update({
      userId: targetRow.wycNumber,
      user: targetUser,
      privileges: targetPrivileges,
      realUserId: realUserId,
      realUser: realUser,
    } satisfies SessionData)

    return { user: targetUser, privileges: targetPrivileges }
  })
