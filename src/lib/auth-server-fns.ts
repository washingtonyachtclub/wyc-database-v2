import { createServerFn } from '@tanstack/react-start'
import { and, count, eq, gte, or } from 'drizzle-orm'
import db from 'src/db/index'
import { lessonQuarter, lessons, officers, posPrivMap, privs, wycDatabase } from 'src/db/schema'
import { hashPasswordArgon2, verifyPasswordDual } from './auth'
import type { Privilege } from './permissions'
import { useAppSession } from './session'

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

  // 2. Dynamic "instr" check — is the user an instructor for any current-quarter lesson?
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

    if (instrRows[0].n > 0 && !userPrivileges.includes('instr')) {
      userPrivileges.push('instr')
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
        message: error?.message || 'An error occurred during login',
      } satisfies LoginResponse
    }
  })

export const hashPasswordArgon2ServerFn = createServerFn({ method: 'POST' })
  .inputValidator((input: string) => input)
  .handler(async ({ data }) => {
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
        message: error?.message || 'An error occurred during logout',
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
