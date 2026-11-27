import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, count, eq, gt, gte, inArray, lt } from 'drizzle-orm'
import { createHash, createHmac, randomBytes } from 'node:crypto'
import db from '@/db/index'
import { qrLoginRequests } from '@/db/schema'
import { isSailLockerMode } from './device-mode'
import { requireAuth } from './auth-middleware'
import { loadAuthUser, loadUserPrivileges } from '@/lib/auth/identity'
import { createAuthenticatedSessionData, useAppSession } from './session'

const QR_LOGIN_TTL_MS = 60 * 1000
const QR_LOGIN_RATE_WINDOW_MS = 10 * 60 * 1000
const QR_LOGIN_MAX_REQUESTS_PER_WINDOW = 10
const QR_LOGIN_RETENTION_MS = 24 * 60 * 60 * 1000
const SECRET_PATTERN = /^[A-Za-z0-9_-]{43}$/

type CreateQrLoginResponse =
  | {
      success: true
      approvalSecret: string
      pollingSecret: string
      expiresAt: number
    }
  | { success: false; message: string }

export type ApproveQrLoginResponse = {
  status: 'approved' | 'unavailable' | 'unauthenticated'
}

export type PollQrLoginResponse = {
  status: 'pending' | 'authenticated' | 'unavailable'
}

function generateSecret(): string {
  return randomBytes(32).toString('base64url')
}

function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex')
}

function hashRequestIp(): string {
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is not set')
  }

  const ip = getRequest().headers.get('CF-Connecting-IP') ?? 'unknown'
  return createHmac('sha256', process.env.SESSION_SECRET).update(ip).digest('hex')
}

function isSameOriginRequest(): boolean {
  const request = getRequest()
  const origin = request.headers.get('origin')
  return origin !== null && origin === new URL(request.url).origin
}

function validSecret(secret: string): boolean {
  return SECRET_PATTERN.test(secret)
}

export const createQrLoginRequestServerFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<CreateQrLoginResponse> => {
    if (!isSailLockerMode()) {
      return { success: false, message: 'QR login is unavailable' }
    }

    try {
      const now = new Date()
      const createdIpHash = hashRequestIp()
      const rateWindowStart = new Date(now.getTime() - QR_LOGIN_RATE_WINDOW_MS)
      const retentionCutoff = new Date(now.getTime() - QR_LOGIN_RETENTION_MS)

      await db.delete(qrLoginRequests).where(lt(qrLoginRequests.createdAt, retentionCutoff))

      const [{ n }] = await db
        .select({ n: count() })
        .from(qrLoginRequests)
        .where(
          and(
            eq(qrLoginRequests.createdIpHash, createdIpHash),
            gte(qrLoginRequests.createdAt, rateWindowStart),
          ),
        )

      if (n >= QR_LOGIN_MAX_REQUESTS_PER_WINDOW) {
        return { success: false, message: 'Too many QR codes requested. Try again shortly.' }
      }

      const approvalSecret = generateSecret()
      const pollingSecret = generateSecret()
      const expiresAt = new Date(now.getTime() + QR_LOGIN_TTL_MS)

      await db.insert(qrLoginRequests).values({
        approvalSecretHash: hashSecret(approvalSecret),
        pollingSecretHash: hashSecret(pollingSecret),
        createdIpHash,
        expiresAt,
        createdAt: now,
      })

      return {
        success: true,
        approvalSecret,
        pollingSecret,
        expiresAt: expiresAt.getTime(),
      }
    } catch (error) {
      console.error('Create QR login request error:', error)
      return { success: false, message: 'Unable to create a QR code' }
    }
  },
)

export const approveQrLoginRequestServerFn = createServerFn({ method: 'POST' })
  .validator((input: { approvalSecret: string }) => ({
    approvalSecret: String(input.approvalSecret),
  }))
  .handler(async ({ data }): Promise<ApproveQrLoginResponse> => {
    if (!validSecret(data.approvalSecret) || !isSameOriginRequest()) {
      return { status: 'unavailable' }
    }

    let approvingMember: number
    try {
      approvingMember = await requireAuth()
    } catch (error) {
      console.error('QR login approval authentication error:', error)
      return { status: 'unauthenticated' }
    }

    try {
      const secret = eq(qrLoginRequests.approvalSecretHash, hashSecret(data.approvalSecret))
      const [approved] = await db
        .update(qrLoginRequests)
        .set({ status: 'approved', approvedBy: approvingMember, approvedAt: new Date() })
        .where(
          and(
            secret,
            eq(qrLoginRequests.status, 'pending'),
            gt(qrLoginRequests.expiresAt, new Date()),
          ),
        )
        .returning({ id: qrLoginRequests.id })
      if (approved) return { status: 'approved' }

      const [existing] = await db
        .select({ id: qrLoginRequests.id })
        .from(qrLoginRequests)
        .where(
          and(
            secret,
            eq(qrLoginRequests.approvedBy, approvingMember),
            inArray(qrLoginRequests.status, ['approved', 'consumed']),
            gt(qrLoginRequests.expiresAt, new Date()),
          ),
        )
      return { status: existing ? 'approved' : 'unavailable' }
    } catch (error) {
      console.error('Approve QR login request error:', error)
      return { status: 'unavailable' }
    }
  })

export const pollQrLoginRequestServerFn = createServerFn({ method: 'POST' })
  .validator((input: { pollingSecret: string }) => ({
    pollingSecret: String(input.pollingSecret),
  }))
  .handler(async ({ data }): Promise<PollQrLoginResponse> => {
    if (!isSailLockerMode() || !validSecret(data.pollingSecret)) {
      return { status: 'unavailable' }
    }

    try {
      const secret = eq(qrLoginRequests.pollingSecretHash, hashSecret(data.pollingSecret))
      const [consumed] = await db
        .update(qrLoginRequests)
        .set({ status: 'consumed', consumedAt: new Date() })
        .where(
          and(
            secret,
            eq(qrLoginRequests.status, 'approved'),
            gt(qrLoginRequests.expiresAt, new Date()),
          ),
        )
        .returning({ wycNumber: qrLoginRequests.approvedBy })
      if (consumed?.wycNumber == null) {
        const [pending] = await db
          .select({ id: qrLoginRequests.id })
          .from(qrLoginRequests)
          .where(
            and(
              secret,
              inArray(qrLoginRequests.status, ['pending', 'approved']),
              gt(qrLoginRequests.expiresAt, new Date()),
            ),
          )
        return { status: pending ? 'pending' : 'unavailable' }
      }
      const [user, privileges] = await Promise.all([
        loadAuthUser(consumed.wycNumber),
        loadUserPrivileges(consumed.wycNumber),
      ])

      if (!user) {
        return { status: 'unavailable' }
      }

      const session = await useAppSession()
      await session.update(createAuthenticatedSessionData(user, privileges))
      return { status: 'authenticated' }
    } catch (error) {
      console.error('Poll QR login request error:', error)
      return { status: 'unavailable' }
    }
  })

export const cancelQrLoginRequestServerFn = createServerFn({ method: 'POST' })
  .validator((input: { pollingSecret: string }) => ({
    pollingSecret: String(input.pollingSecret),
  }))
  .handler(async ({ data }) => {
    if (!isSailLockerMode() || !validSecret(data.pollingSecret)) {
      return { success: false }
    }

    try {
      await db
        .update(qrLoginRequests)
        .set({ status: 'canceled', canceledAt: new Date() })
        .where(
          and(
            eq(qrLoginRequests.pollingSecretHash, hashSecret(data.pollingSecret)),
            inArray(qrLoginRequests.status, ['pending', 'approved']),
            gt(qrLoginRequests.expiresAt, new Date()),
          ),
        )
      return { success: true }
    } catch (error) {
      console.error('Cancel QR login request error:', error)
      return { success: false }
    }
  })
