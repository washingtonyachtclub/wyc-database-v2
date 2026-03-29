import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import db from 'src/db/index'
import { wycDatabase } from 'src/db/schema'
import { hashPasswordArgon2, hashPasswordLegacy } from './auth'
import { requireAuth } from './auth-middleware'
import { sendEmail } from './email'
import { passwordResetEmail, wycNumberLookupEmail } from './email-templates'
import { generatePassphrase } from './generate-passphrase'

export const setPasswordServerFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { newPassword: string }) => {
    if (!input.newPassword || input.newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters')
    }
    return { newPassword: String(input.newPassword) }
  })
  .handler(async ({ data }) => {
    try {
      const userId = await requireAuth()

      const argon2Hash = await hashPasswordArgon2(data.newPassword)
      const legacyHash = hashPasswordLegacy(data.newPassword)

      await db
        .update(wycDatabase)
        .set({ password: legacyHash, passwordArgon2: argon2Hash })
        .where(eq(wycDatabase.wycNumber, userId))

      return { success: true, message: 'Password updated successfully' }
    } catch (error: any) {
      console.error('Set password error:', error)
      if (error?.message === 'Unauthorized: No session found') {
        return { success: false, message: 'You must be logged in to change your password' }
      }
      return { success: false, message: 'Failed to update password' }
    }
  })

export const lookupWycNumberServerFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { email: string }) => {
    if (!input.email?.trim()) throw new Error('Email is required')
    return { email: String(input.email).trim().toLowerCase() }
  })
  .handler(async ({ data }) => {
    try {
      const rows = await db
        .select({
          wycNumber: wycDatabase.wycNumber,
          first: wycDatabase.first,
          last: wycDatabase.last,
        })
        .from(wycDatabase)
        .where(eq(wycDatabase.email, data.email))

      if (rows.length === 0) {
        return {
          success: false as const,
          message: 'No account found with that email address',
        }
      }

      const members = rows.map((r) => ({
        wycNumber: r.wycNumber,
        name: `${r.first ?? ''} ${r.last ?? ''}`.trim(),
      }))

      let emailSent = false
      let emailSimulated = false
      try {
        const emailText = wycNumberLookupEmail(data.email, members)
        const result = await sendEmail({
          to: data.email,
          subject: 'WYC Database - Your WYC Number',
          text: emailText,
          idempotencyKey: `wyc-lookup/${data.email}/${Date.now()}`,
        })
        emailSent = true
        emailSimulated = result.simulated
      } catch (emailError) {
        console.error('Failed to send WYC number lookup email:', emailError)
      }

      return { success: true as const, emailSent, emailSimulated }
    } catch (error: any) {
      console.error('WYC number lookup error:', error)
      return { success: false as const, message: 'Failed to look up WYC number' }
    }
  })

export const resetPasswordServerFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { wycNumber: number; email: string }) => {
    if (!input.wycNumber || !input.email?.trim()) {
      throw new Error('WYC Number and email are required')
    }
    return {
      wycNumber: Number(input.wycNumber),
      email: String(input.email).trim().toLowerCase(),
    }
  })
  .handler(async ({ data }) => {
    try {
      const [user] = await db
        .select({
          wycNumber: wycDatabase.wycNumber,
          first: wycDatabase.first,
          last: wycDatabase.last,
          email: wycDatabase.email,
        })
        .from(wycDatabase)
        .where(eq(wycDatabase.wycNumber, data.wycNumber))
        .limit(1)

      if (!user || !user.email || user.email.trim().toLowerCase() !== data.email) {
        return {
          success: false as const,
          message: 'WYC number and email do not match our records',
        }
      }

      const passphrase = generatePassphrase()
      const argon2Hash = await hashPasswordArgon2(passphrase)
      const legacyHash = hashPasswordLegacy(passphrase)

      await db
        .update(wycDatabase)
        .set({ password: legacyHash, passwordArgon2: argon2Hash })
        .where(eq(wycDatabase.wycNumber, user.wycNumber))

      const name = `${user.first ?? ''} ${user.last ?? ''}`.trim()
      const emailText = passwordResetEmail(name, user.wycNumber, passphrase)

      let emailSent = false
      let emailSimulated = false
      try {
        const result = await sendEmail({
          to: user.email,
          subject: 'WYC Database - Password Reset',
          text: emailText,
          idempotencyKey: `password-reset/${user.wycNumber}/${Date.now()}`,
        })
        emailSent = true
        emailSimulated = result.simulated
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError)
      }

      return { success: true as const, emailSent, emailSimulated }
    } catch (error: any) {
      console.error('Reset password error:', error)
      return { success: false as const, message: 'Failed to reset password' }
    }
  })
