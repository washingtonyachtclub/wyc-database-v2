import db from '@/db'
import { memberWaivers, membershipRenewals, wycDatabase } from '@/db/schema'
import { requireAuth } from '@/lib/auth/auth-middleware'
import { isDevEnvironment } from '@/lib/env'
import { createServerFn } from '@tanstack/react-start'
import { and, eq, isNull } from 'drizzle-orm'
import { createHash, randomUUID } from 'node:crypto'
import { z } from 'zod'
import {
  reconcileRenewal,
  sendRenewalCompletedEmail,
  type RenewalCompletion,
} from '../renewals/renewal-coordinator'
import { memberWaiverVersion } from './member-waiver-content'
import { createMemberWaiverPdf } from './member-waiver-pdf'
import { uploadWaiverPdf } from './r2'

const requiredAcknowledgement = z.boolean().refine((value) => value, {
  message: 'Adult acknowledgement is required',
})

const memberWaiverSchema = z.object({
  adultAcknowledged: requiredAcknowledgement,
  renewalId: z.uuid(),
  signatureDataUrl: z
    .string()
    .max(1_500_000)
    .regex(/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/),
  testAcknowledged: z.boolean(),
})

export type MemberWaiverInput = z.infer<typeof memberWaiverSchema>

export const submitMemberWaiver = createServerFn({ method: 'POST' })
  .inputValidator((input: MemberWaiverInput) => memberWaiverSchema.parse(input))
  .handler(async ({ data }) => {
    const wycNumber = await requireAuth()
    const isMock = isDevEnvironment()
    if (isMock && !data.testAcknowledged) {
      throw new Error('Mock waiver acknowledgement is required')
    }

    const [renewal] = await db
      .select({
        closedAt: membershipRenewals.closedAt,
        completedAt: membershipRenewals.completedAt,
        email: wycDatabase.email,
        first: wycDatabase.first,
        last: wycDatabase.last,
        targetExpireQtr: membershipRenewals.targetExpireQtr,
      })
      .from(membershipRenewals)
      .innerJoin(wycDatabase, eq(wycDatabase.wycNumber, membershipRenewals.wycNumber))
      .where(
        and(eq(membershipRenewals.id, data.renewalId), eq(membershipRenewals.wycNumber, wycNumber)),
      )
    if (!renewal) throw new Error('Renewal not found.')
    if (renewal.closedAt) throw new Error('This renewal is closed.')

    const [existing] = await db
      .select({ id: memberWaivers.id })
      .from(memberWaivers)
      .where(eq(memberWaivers.renewalId, data.renewalId))
    if (existing) {
      if (!renewal.completedAt && !renewal.closedAt) {
        let recoveredCompletion: RenewalCompletion | null = null
        try {
          await db.transaction(async (tx) => {
            recoveredCompletion = await reconcileRenewal(tx, data.renewalId)
          })
        } catch (error) {
          console.error('Member waiver renewal recovery failed:', error)
          return {
            success: false as const,
            message: 'The waiver is stored, but the renewal could not be completed. Please retry.',
          }
        }
        if (recoveredCompletion) {
          const email = await sendRenewalCompletedEmail(recoveredCompletion)
          return {
            success: true as const,
            alreadyStored: true as const,
            renewalCompleted: true as const,
            ...email,
          }
        }
      }
      return {
        success: true as const,
        alreadyStored: true as const,
        renewalCompleted: renewal.completedAt !== null,
      }
    }

    const acceptanceId = randomUUID()
    const signedAt = new Date().toISOString()
    const objectKey = isMock
      ? `mock/member/${acceptanceId}.pdf`
      : `waivers/v1/member/${signedAt.slice(0, 4)}/${acceptanceId}.pdf`
    const filename = `${isMock ? 'mock-' : ''}wyc-member-waiver-${acceptanceId}.pdf`
    let pdf: Uint8Array
    let sha256: string
    let completion: RenewalCompletion | null = null

    try {
      pdf = await createMemberWaiverPdf({
        acceptanceId,
        adultAcknowledged: data.adultAcknowledged,
        email: renewal.email ?? '',
        firstName: renewal.first ?? '',
        isMock,
        lastName: renewal.last ?? '',
        renewalId: data.renewalId,
        signatureDataUrl: data.signatureDataUrl,
        signedAt,
        testAcknowledged: data.testAcknowledged,
        wycNumber,
      })
      sha256 = createHash('sha256').update(pdf).digest('hex')

      await uploadWaiverPdf({
        acceptanceId,
        body: pdf,
        filename,
        key: objectKey,
        sha256,
      })

      await db.transaction(async (tx) => {
        const [openRenewal] = await tx
          .select({ id: membershipRenewals.id })
          .from(membershipRenewals)
          .where(
            and(
              eq(membershipRenewals.id, data.renewalId),
              eq(membershipRenewals.wycNumber, wycNumber),
              isNull(membershipRenewals.completedAt),
              isNull(membershipRenewals.closedAt),
            ),
          )
          .for('update')
        if (!openRenewal) throw new Error('Renewal is no longer open')

        const submittedValues = { adultAcknowledged: data.adultAcknowledged }
        await tx.insert(memberWaivers).values({
          id: acceptanceId,
          renewalId: data.renewalId,
          applicationId: null,
          waiverVersion: memberWaiverVersion,
          firstName: renewal.first ?? '',
          lastName: renewal.last ?? '',
          email: renewal.email ?? '',
          submittedValues: isMock
            ? { ...submittedValues, testAcknowledged: data.testAcknowledged }
            : submittedValues,
          signedAt: new Date(signedAt),
          objectKey,
          pdfSha256: sha256,
          pdfSize: pdf.byteLength,
          pdfContentType: 'application/pdf',
        })
        completion = await reconcileRenewal(tx, data.renewalId)
      })
    } catch (error) {
      console.error('Member waiver submission failed:', error)
      return {
        success: false as const,
        message: 'The waiver could not be signed and stored. Please try again.',
      }
    }

    const email = completion
      ? await sendRenewalCompletedEmail(completion)
      : { emailSent: false, emailSimulated: false, quarterLabel: null }

    if (isMock) {
      return {
        success: true as const,
        acceptanceId,
        isMock: true as const,
        objectKey,
        renewalCompleted: completion !== null,
        sha256,
        size: pdf.byteLength,
        signedAt,
        ...email,
      }
    }

    return {
      success: true as const,
      isMock: false as const,
      renewalCompleted: completion !== null,
      ...email,
    }
  })
