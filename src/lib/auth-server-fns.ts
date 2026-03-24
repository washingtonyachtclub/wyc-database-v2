import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import db from 'src/db/index'
import { wycDatabase } from 'src/db/schema'
import { hashPasswordArgon2, verifyPasswordDual } from './auth'
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

      await session.update({
        userId: user.wycNumber,
        user: userData,
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
      } satisfies CurrentUserResponse
    } catch (error: any) {
      console.error('Get current user error:', error)
      return {
        isValid: false,
      } satisfies CurrentUserResponse
    }
  },
)
