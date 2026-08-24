import { createServerFn } from '@tanstack/react-start'
import { getRequest, getRequestIP } from '@tanstack/react-start/server'
import { and, count, eq, gt, gte, inArray, lt } from 'drizzle-orm'
import { createHash, createHmac, randomBytes } from 'node:crypto'
import db from '@/db/index'
import { qrLoginRequests } from '@/db/schema'
import { isSailLockerMode } from './device-mode'
import { requireAuth } from './auth-middleware'
import { loadAuthUser, loadUserPrivileges } from './identity'
import { createAuthenticatedSessionData, useAppSession } from './session'

const QR_LOGIN_TTL_MS = 2 * 60 * 1000
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

  const ip = getRequestIP({ xForwardedFor: process.env.VERCEL === '1' }) ?? 'unknown'
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
  .inputValidator((input: { approvalSecret: string }) => ({
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
      return await db.transaction(async (tx): Promise<ApproveQrLoginResponse> => {
        const [request] = await tx
          .select()
          .from(qrLoginRequests)
          .where(eq(qrLoginRequests.approvalSecretHash, hashSecret(data.approvalSecret)))
          .limit(1)
          .for('update')

        if (!request) {
          return { status: 'unavailable' }
        }

        if (request.expiresAt.getTime() <= Date.now()) {
          if (request.status === 'pending' || request.status === 'approved') {
            await tx
              .update(qrLoginRequests)
              .set({ status: 'expired' })
              .where(eq(qrLoginRequests.id, request.id))
          }
          return { status: 'unavailable' }
        }

        if (
          (request.status === 'approved' || request.status === 'consumed') &&
          request.approvedBy === approvingMember
        ) {
          return { status: 'approved' }
        }

        if (request.status !== 'pending') {
          return { status: 'unavailable' }
        }

        await tx
          .update(qrLoginRequests)
          .set({
            status: 'approved',
            approvedBy: approvingMember,
            approvedAt: new Date(),
          })
          .where(eq(qrLoginRequests.id, request.id))

        return { status: 'approved' }
      })
    } catch (error) {
      console.error('Approve QR login request error:', error)
      return { status: 'unavailable' }
    }
  })

export const pollQrLoginRequestServerFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { pollingSecret: string }) => ({
    pollingSecret: String(input.pollingSecret),
  }))
  .handler(async ({ data }): Promise<PollQrLoginResponse> => {
    if (!isSailLockerMode() || !validSecret(data.pollingSecret)) {
      return { status: 'unavailable' }
    }

    try {
      const result = await db.transaction(
        async (
          tx,
        ): Promise<
          { status: 'pending' | 'unavailable' } | { status: 'consume'; wycNumber: number }
        > => {
          const [request] = await tx
            .select()
            .from(qrLoginRequests)
            .where(eq(qrLoginRequests.pollingSecretHash, hashSecret(data.pollingSecret)))
            .limit(1)
            .for('update')

          if (!request) {
            return { status: 'unavailable' }
          }

          if (request.expiresAt.getTime() <= Date.now()) {
            if (request.status === 'pending' || request.status === 'approved') {
              await tx
                .update(qrLoginRequests)
                .set({ status: 'expired' })
                .where(eq(qrLoginRequests.id, request.id))
            }
            return { status: 'unavailable' }
          }

          if (request.status === 'pending') {
            return { status: 'pending' }
          }

          if (request.status !== 'approved' || request.approvedBy === null) {
            return { status: 'unavailable' }
          }

          await tx
            .update(qrLoginRequests)
            .set({ status: 'consumed', consumedAt: new Date() })
            .where(eq(qrLoginRequests.id, request.id))

          return { status: 'consume', wycNumber: request.approvedBy }
        },
      )

      if (result.status !== 'consume') {
        return result
      }

      const [user, privileges] = await Promise.all([
        loadAuthUser(result.wycNumber),
        loadUserPrivileges(result.wycNumber),
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
  .inputValidator((input: { pollingSecret: string }) => ({
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
