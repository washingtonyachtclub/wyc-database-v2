import { and, count, desc, eq, gt, gte, isNull, lt, sql } from 'drizzle-orm'
import { randomInt } from 'node:crypto'
import db from 'src/db/index'
import { otpCodes } from 'src/db/schema'
import { hashPasswordArgon2, verifyPasswordArgon2 } from './auth'

export type OtpChannel = 'email' | 'sms'
export type OtpPurpose = 'login'

export const OTP_CODE_TTL_MS = 10 * 60 * 1000
export const OTP_MAX_ATTEMPTS = 5
export const OTP_REQUEST_WINDOW_MS = 10 * 60 * 1000
export const OTP_MAX_REQUESTS_PER_WINDOW = 3
export const OTP_MIN_REQUEST_INTERVAL_MS = 30 * 1000

export type ConsumeResult =
  | { ok: true }
  | { ok: false; reason: 'no_code' | 'expired' | 'locked' | 'invalid' }

export type RequestLimitResult =
  | { ok: true }
  | { ok: false; reason: 'too_frequent' | 'too_many' }

/** Cryptographically secure 6-digit string (100000–999999). */
export function generateCode(): string {
  return String(randomInt(100000, 1000000))
}

export function hashCode(code: string): Promise<string> {
  return hashPasswordArgon2(code)
}

export function verifyCodeHash(code: string, hash: string): Promise<boolean> {
  return verifyPasswordArgon2(code, hash)
}

/**
 * Check whether this (wycNumber, channel) is within request rate limits.
 * Call before creating a new OTP record.
 */
export async function checkRequestRateLimit(params: {
  wycNumber: number
  channel: OtpChannel
}): Promise<RequestLimitResult> {
  const { wycNumber, channel } = params
  const windowStart = new Date(Date.now() - OTP_REQUEST_WINDOW_MS)
  const minIntervalStart = new Date(Date.now() - OTP_MIN_REQUEST_INTERVAL_MS)

  const [recent] = await db
    .select({ createdAt: otpCodes.createdAt })
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.wycNumber, wycNumber),
        eq(otpCodes.channel, channel),
        gt(otpCodes.createdAt, minIntervalStart),
      ),
    )
    .orderBy(desc(otpCodes.createdAt))
    .limit(1)

  if (recent) {
    return { ok: false, reason: 'too_frequent' }
  }

  const [{ n }] = await db
    .select({ n: count() })
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.wycNumber, wycNumber),
        eq(otpCodes.channel, channel),
        gte(otpCodes.createdAt, windowStart),
      ),
    )

  if (n >= OTP_MAX_REQUESTS_PER_WINDOW) {
    return { ok: false, reason: 'too_many' }
  }

  return { ok: true }
}

/**
 * Create a new OTP record.
 *   - Lazy-deletes expired rows for this (wycNumber, channel)
 *   - Invalidates any prior unused codes for (wycNumber, channel, purpose)
 *   - Inserts a hashed row expiring in OTP_CODE_TTL_MS
 */
export async function createOtpRecord(params: {
  wycNumber: number
  channel: OtpChannel
  purpose: OtpPurpose
  destination: string
  code: string
}): Promise<void> {
  const { wycNumber, channel, purpose, destination, code } = params

  await db.delete(otpCodes).where(lt(otpCodes.expiresAt, new Date()))

  await db
    .update(otpCodes)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(otpCodes.wycNumber, wycNumber),
        eq(otpCodes.channel, channel),
        eq(otpCodes.purpose, purpose),
        isNull(otpCodes.consumedAt),
      ),
    )

  const codeHash = await hashCode(code)
  const expiresAt = new Date(Date.now() + OTP_CODE_TTL_MS)

  await db.insert(otpCodes).values({
    wycNumber,
    channel,
    purpose,
    destination,
    codeHash,
    expiresAt,
    maxAttempts: OTP_MAX_ATTEMPTS,
  })
}

/**
 * Verify a code against the latest non-consumed, non-expired record for
 * (wycNumber, channel, purpose). On success, marks it consumed. On failure,
 * increments attempts (the row "dies" once attempts >= max_attempts).
 */
export async function consumeOtp(params: {
  wycNumber: number
  channel: OtpChannel
  purpose: OtpPurpose
  code: string
}): Promise<ConsumeResult> {
  const { wycNumber, channel, purpose, code } = params

  const [row] = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.wycNumber, wycNumber),
        eq(otpCodes.channel, channel),
        eq(otpCodes.purpose, purpose),
        isNull(otpCodes.consumedAt),
      ),
    )
    .orderBy(desc(otpCodes.createdAt))
    .limit(1)

  if (!row) {
    return { ok: false, reason: 'no_code' }
  }

  if (row.expiresAt.getTime() <= Date.now()) {
    return { ok: false, reason: 'expired' }
  }

  if (row.attempts >= row.maxAttempts) {
    return { ok: false, reason: 'locked' }
  }

  const valid = await verifyCodeHash(code, row.codeHash)

  if (!valid) {
    await db
      .update(otpCodes)
      .set({ attempts: sql`${otpCodes.attempts} + 1` })
      .where(eq(otpCodes.id, row.id))
    return { ok: false, reason: 'invalid' }
  }

  await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, row.id))
  return { ok: true }
}

/**
 * Mask an email for user-facing display: "john@gmail.com" -> "jo***@gm***.com".
 * Keeps first 2 chars of local part and 2 chars of domain label.
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***'
  const maskedLocal = local.length <= 2 ? local[0] + '*' : local.slice(0, 2) + '***'
  const dotIdx = domain.indexOf('.')
  if (dotIdx === -1) return `${maskedLocal}@${domain.slice(0, 2)}***`
  const host = domain.slice(0, dotIdx)
  const tld = domain.slice(dotIdx)
  const maskedHost = host.length <= 2 ? host[0] + '*' : host.slice(0, 2) + '***'
  return `${maskedLocal}@${maskedHost}${tld}`
}
