import db from '@/db'
import {
  memberWaivers,
  membershipApplications,
  membershipPayments,
  quarters,
  wycDatabase,
} from '@/db/schema'
import {
  MembershipPaymentError,
  chargeMembershipOrder,
  createMembershipOrder,
  getMembershipPrice,
} from '@/domains/membership-payments/square-payment'
import { parseDiscountCodeSelection } from '@/domains/membership-discount-codes/schema'
import {
  insertMembershipDiscountCodeRedemption,
  resolveMembershipDiscountCode,
} from '@/domains/membership-discount-codes/service'
import type { RenewalDuration, RenewalTier } from '@/domains/renewals/compute-renewal'
import { RENEWAL_QUARTER, computeRenewal } from '@/domains/renewals/compute-renewal'
import { parseQuestionnaire, tierForUwStatus } from '@/domains/renewals/questionnaire'
import { isDevEnvironment } from '@/lib/env'
import { createMemberWaiverPdf } from '../waivers/member-waiver-pdf'
import { memberWaiverVersion } from '../waivers/member-waiver-content'
import { uploadWaiverPdf } from '../waivers/r2'
import {
  CURRENT_NEW_MEMBER_QUESTIONNAIRE_VERSION,
  newMemberQuestionnaireVersions,
  parseNewMemberQuestionnaire,
  type NewMemberQuestionnaireVersion,
} from './questionnaire'
import { createServerFn } from '@tanstack/react-start'
import { getRequest, getRequestIP } from '@tanstack/react-start/server'
import { and, count, eq, gte, isNull } from 'drizzle-orm'
import { createHash, createHmac, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { sendApplicationCompletionEmail } from './email'
import { canCompleteMembershipApplication } from './funding'

const APPLICATION_RATE_WINDOW_MS = 30 * 60 * 1000
const MAX_APPLICATIONS_PER_WINDOW = 8
const applicationIdSchema = z.uuid()
const emailSchema = z.string().trim().email().max(254)
const requiredText = (max: number) => z.string().trim().min(1).max(max)

const applicantInputShape = {
  firstName: requiredText(60),
  lastName: requiredText(60),
  primaryEmail: emailSchema,
  questionnaire: z.unknown(),
  uwEmail: z.union([emailSchema, z.literal('')]).optional(),
}

function parseApplicantInput<T extends z.output<z.ZodObject<typeof applicantInputShape>>>(
  input: T,
) {
  return {
    ...input,
    questionnaire: parseQuestionnaire(input.questionnaire),
    uwEmail: input.uwEmail || null,
  }
}

function requireStudentUwEmail(
  input: { questionnaire: { uwStatus: string }; uwEmail: string | null },
  context: z.RefinementCtx,
) {
  if (input.questionnaire.uwStatus === 'student' && !input.uwEmail) {
    context.addIssue({
      code: 'custom',
      message: 'UW email is required for students.',
      path: ['uwEmail'],
    })
  }
}

const paymentInputSchema = z
  .object({
    ...applicantInputShape,
    duration: z.enum(['quarterly', 'annual']),
    discountCode: z.unknown().optional(),
    sourceId: requiredText(2_000),
  })
  .transform((input) => ({
    ...parseApplicantInput(input),
    discountCode: parseDiscountCodeSelection(input.discountCode),
  }))
  .superRefine(requireStudentUwEmail)

const exemptionInputSchema = z
  .object(applicantInputShape)
  .transform(parseApplicantInput)
  .superRefine(requireStudentUwEmail)

const completionInputSchema = z
  .object({
    adultAcknowledged: z.boolean().refine(Boolean, 'Adult acknowledgement is required'),
    applicationId: applicationIdSchema,
    contact: z.object({
      addressLine1: requiredText(100),
      addressLine2: z.string().trim().max(100),
      city: requiredText(50),
      emergencyFirstName: requiredText(60),
      emergencyLastName: requiredText(60),
      emergencyPhone: requiredText(50),
      emergencyRelationship: requiredText(100),
      phone: requiredText(50),
      state: requiredText(20),
      zipCode: requiredText(10),
    }),
    questionnaire: z.unknown(),
    signatureDataUrl: z
      .string()
      .max(1_500_000)
      .regex(/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/),
    testAcknowledged: z.boolean(),
  })
  .superRefine((input, context) => {
    const combinedAddress = [input.contact.addressLine1, input.contact.addressLine2]
      .filter(Boolean)
      .join(', ')
    if (combinedAddress.length > 100) {
      context.addIssue({
        code: 'custom',
        message: 'The combined street address must be 100 characters or fewer.',
        path: ['contact', 'addressLine2'],
      })
    }
  })

function hashRequestIp(): string {
  if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is not set')
  const ip = getRequestIP({ xForwardedFor: process.env.VERCEL === '1' }) ?? 'unknown'
  return createHmac('sha256', process.env.SESSION_SECRET).update(ip).digest('hex')
}

function parseTier(value: unknown): RenewalTier {
  if (value === 'student' || value === 'nonstudent') return value
  throw new Error('Invalid membership tier')
}

function parseDuration(value: unknown): RenewalDuration {
  if (value === 'quarterly' || value === 'annual') return value
  throw new Error('Invalid membership duration')
}

async function updatePaymentStatus(applicationId: string, paymentStatus: string) {
  try {
    await db
      .update(membershipApplications)
      .set({ paymentStatus })
      .where(eq(membershipApplications.id, applicationId))
  } catch (error) {
    console.error('Failed to update membership application payment status:', {
      applicationId,
      paymentStatus,
      error,
    })
  }
}

type ApplicantInput = z.output<typeof exemptionInputSchema>

async function createMembershipApplication(
  input: ApplicantInput,
  duration: RenewalDuration,
  paymentStatus: 'pending' | 'exemption_requested',
) {
  const now = new Date()
  let createdIpHash: string
  let applicationCount: number
  try {
    createdIpHash = hashRequestIp()
    const [rateLimit] = await db
      .select({ applicationCount: count() })
      .from(membershipApplications)
      .where(
        and(
          eq(membershipApplications.createdIpHash, createdIpHash),
          gte(
            membershipApplications.createdAt,
            new Date(now.getTime() - APPLICATION_RATE_WINDOW_MS),
          ),
        ),
      )
    applicationCount = rateLimit.applicationCount
  } catch (error) {
    console.error('Failed to check new-member application rate limit:', error)
    return {
      success: false as const,
      retryAllowed: true as const,
      message: 'We could not start your application. Please try again.',
    }
  }
  if (applicationCount >= MAX_APPLICATIONS_PER_WINDOW) {
    return {
      success: false as const,
      retryAllowed: false as const,
      message: 'Too many application attempts. Please wait and try again later.',
    }
  }

  const applicationId = randomUUID()
  const targetExpireQtr = computeRenewal(0, duration)
  const tier = tierForUwStatus(input.questionnaire.uwStatus)
  try {
    await db.insert(membershipApplications).values({
      id: applicationId,
      createdAt: now,
      createdIpHash,
      duration,
      firstName: input.firstName,
      lastName: input.lastName,
      paymentStatus,
      plusOneResponse: input.questionnaire.plusOneResponse,
      primaryEmail: input.primaryEmail,
      questionnaireVersion: CURRENT_NEW_MEMBER_QUESTIONNAIRE_VERSION,
      submittedPrimaryEmail: input.primaryEmail,
      submittedUwEmail: input.uwEmail,
      targetExpireQtr,
      tier,
      uwEmail: input.uwEmail,
      uwStatus: input.questionnaire.uwStatus,
    })
    return { success: true as const, applicationId, targetExpireQtr, tier }
  } catch (error) {
    console.error('Failed to create membership application:', error)
    return {
      success: false as const,
      retryAllowed: true as const,
      message: 'We could not start your application. Please try again.',
    }
  }
}

export const checkNewMemberEmail = createServerFn({ method: 'POST' })
  .inputValidator((input: { email: string }) => emailSchema.parse(input.email))
  .handler(async ({ data: email }) => {
    try {
      const [member] = await db
        .select({ wycNumber: wycDatabase.wycNumber })
        .from(wycDatabase)
        .where(eq(wycDatabase.email, email))
        .limit(1)
      return { existingMember: Boolean(member) }
    } catch (error) {
      console.error('Failed to check new-member email:', error)
      throw new Error('Could not check the email address')
    }
  })

export const getNewMemberSignupOptions = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const targets = {
      annual: computeRenewal(0, 'annual'),
      quarterly: computeRenewal(0, 'quarterly'),
    }
    const rows = await db
      .select({ index: quarters.index, school: quarters.school })
      .from(quarters)
      .where(gte(quarters.index, RENEWAL_QUARTER))
    const labelFor = (index: number) =>
      rows.find((quarter) => quarter.index === index)?.school ?? `quarter ${index}`

    return {
      annual: { targetExpireQtr: targets.annual, targetLabel: labelFor(targets.annual) },
      quarterly: {
        targetExpireQtr: targets.quarterly,
        targetLabel: labelFor(targets.quarterly),
      },
    }
  } catch (error) {
    console.error('Failed to load new-member signup options:', error)
    throw new Error('Could not load membership options')
  }
})

export const getNewMemberPrice = createServerFn({ method: 'GET' })
  .inputValidator((input: { duration: string; tier: string }) => ({
    duration: parseDuration(input.duration),
    tier: parseTier(input.tier),
  }))
  .handler(async ({ data }) => {
    try {
      return await getMembershipPrice(data.tier, data.duration)
    } catch (error) {
      console.error('Failed to fetch new-member price:', error)
      throw new Error('Could not load the membership price')
    }
  })

export const startNewMemberExemption = createServerFn({ method: 'POST' })
  .inputValidator((input: z.input<typeof exemptionInputSchema>) =>
    exemptionInputSchema.parse(input),
  )
  .handler(async ({ data }) => {
    const application = await createMembershipApplication(data, 'quarterly', 'exemption_requested')
    if (!application.success) return application

    let email = { emailSent: false, emailSimulated: false }
    try {
      email = await sendApplicationCompletionEmail({
        applicationId: application.applicationId,
        firstName: data.firstName,
        lastName: data.lastName,
        origin: getRequest().url,
        primaryEmail: data.primaryEmail,
        type: 'initial',
      })
    } catch (error) {
      console.error('Failed to send new-member exemption completion email:', {
        applicationId: application.applicationId,
        error,
      })
    }
    return {
      applicationId: application.applicationId,
      success: true as const,
      ...email,
    }
  })

export const startNewMemberPayment = createServerFn({ method: 'POST' })
  .inputValidator((input: z.input<typeof paymentInputSchema>) => paymentInputSchema.parse(input))
  .handler(async ({ data }) => {
    const tier = tierForUwStatus(data.questionnaire.uwStatus)
    const discountCode = data.discountCode
      ? await getMembershipPrice(tier, data.duration).then((price) =>
          resolveMembershipDiscountCode({
            audience: 'new_members',
            code: data.discountCode!.code,
            currency: price.currency,
            expectedRevision: data.discountCode!.revision,
            subtotalCents: price.amountCents,
          }),
        )
      : null
    const application = await createMembershipApplication(data, data.duration, 'pending')
    if (!application.success) return application
    const { applicationId, targetExpireQtr } = application

    let order: Awaited<ReturnType<typeof createMembershipOrder>>
    try {
      order = await createMembershipOrder({
        discount: discountCode,
        duration: data.duration,
        idempotencyKey: `join-o/${applicationId}`,
        tier,
      })
      await db
        .update(membershipApplications)
        .set({ squareOrderId: order.orderId })
        .where(eq(membershipApplications.id, applicationId))
    } catch (error) {
      console.error('Failed to create new-member Square order:', { applicationId, error })
      await updatePaymentStatus(applicationId, 'failed')
      return {
        success: false as const,
        retryAllowed: true as const,
        message: 'We could not start your payment. Please try again.',
      }
    }

    const paymentIdempotencyKey = `join-p/${createHash('sha256')
      .update(`${applicationId}/${data.sourceId}`)
      .digest('hex')
      .slice(0, 32)}`
    try {
      await db
        .update(membershipApplications)
        .set({ paymentIdempotencyKey })
        .where(eq(membershipApplications.id, applicationId))
    } catch (error) {
      console.error('Failed to store new-member payment attempt:', { applicationId, error })
      await updatePaymentStatus(applicationId, 'failed')
      return {
        success: false as const,
        retryAllowed: true as const,
        message: 'We could not start your payment. Please try again.',
      }
    }

    let squarePaymentId: string
    try {
      const payment = await chargeMembershipOrder({
        buyerEmail: data.primaryEmail,
        idempotencyKey: paymentIdempotencyKey,
        order,
        sourceId: data.sourceId,
      })
      squarePaymentId = payment.id!
    } catch (error) {
      console.error('New-member Square payment failed:', {
        applicationId,
        orderId: order.orderId,
        error,
      })
      if (error instanceof MembershipPaymentError && error.kind === 'unknown') {
        await updatePaymentStatus(applicationId, 'reconciliation_required')
        return {
          applicationId,
          success: false as const,
          retryAllowed: false as const,
          message:
            'We could not confirm whether your payment completed. Do not retry. Please contact the club.',
        }
      }
      await updatePaymentStatus(applicationId, 'failed')
      return {
        success: false as const,
        retryAllowed: true as const,
        message:
          error instanceof MembershipPaymentError
            ? error.message
            : 'We could not process your payment. Please try again.',
      }
    }

    try {
      await db.transaction(async (tx) => {
        const [application] = await tx
          .select({ paymentStatus: membershipApplications.paymentStatus })
          .from(membershipApplications)
          .where(eq(membershipApplications.id, applicationId))
          .for('update')
        if (!application || application.paymentStatus !== 'pending') {
          throw new Error('Application payment state changed')
        }

        const result = await tx.insert(membershipPayments).values({
          amountCents: order.amountCents,
          applicationId,
          currency: order.currency,
          duration: data.duration,
          newExpireQtr: targetExpireQtr,
          prevExpireQtr: 0,
          squareOrderId: order.orderId,
          squarePaymentId,
          status: 'COMPLETED',
          tier,
          wycNumber: null,
        })
        if (discountCode) {
          await insertMembershipDiscountCodeRedemption(tx, {
            discountCents: order.discountCents,
            finalCents: order.amountCents,
            paymentId: result[0].insertId,
            discountCode,
            subtotalCents: order.subtotalCents,
          })
        }
        await tx
          .update(membershipApplications)
          .set({ paymentCompletedAt: new Date(), paymentStatus: 'completed' })
          .where(eq(membershipApplications.id, applicationId))
      })
    } catch (error) {
      console.error('New-member payment completed but database recording failed:', {
        applicationId,
        orderId: order.orderId,
        squarePaymentId,
        error,
      })
      await updatePaymentStatus(applicationId, 'reconciliation_required')
      return {
        applicationId,
        success: false as const,
        retryAllowed: false as const,
        message:
          'Your payment went through, but we could not finish recording it. Do not pay again. Please contact the club.',
      }
    }

    let email = { emailSent: false, emailSimulated: false }
    try {
      email = await sendApplicationCompletionEmail({
        applicationId,
        firstName: data.firstName,
        lastName: data.lastName,
        origin: getRequest().url,
        primaryEmail: data.primaryEmail,
        type: 'initial',
      })
    } catch (error) {
      console.error('Failed to send new-member completion email:', { applicationId, error })
    }
    return {
      applicationId,
      amountCents: order.amountCents,
      currency: order.currency,
      success: true as const,
      ...email,
    }
  })

export const getNewMemberApplication = createServerFn({ method: 'GET' })
  .inputValidator((input: { applicationId: string }) => String(input.applicationId))
  .handler(async ({ data: applicationId }) => {
    if (!applicationIdSchema.safeParse(applicationId).success) {
      return { status: 'not_found' as const }
    }
    try {
      const [application] = await db
        .select({
          firstName: membershipApplications.firstName,
          lastName: membershipApplications.lastName,
          paymentStatus: membershipApplications.paymentStatus,
          primaryEmail: membershipApplications.primaryEmail,
          questionnaireVersion: membershipApplications.questionnaireVersion,
          requirementsCompletedAt: membershipApplications.requirementsCompletedAt,
          reviewStatus: membershipApplications.reviewStatus,
          targetExpireQtr: membershipApplications.targetExpireQtr,
          waiverId: memberWaivers.id,
        })
        .from(membershipApplications)
        .leftJoin(memberWaivers, eq(memberWaivers.applicationId, membershipApplications.id))
        .where(eq(membershipApplications.id, applicationId))
        .limit(1)

      if (!application) return { status: 'not_found' as const }
      const [quarter] = await db
        .select({ school: quarters.school })
        .from(quarters)
        .where(eq(quarters.index, application.targetExpireQtr))
        .limit(1)

      return {
        status: 'found' as const,
        application: {
          firstName: application.firstName,
          lastName: application.lastName,
          paymentStatus: application.paymentStatus,
          primaryEmail: application.primaryEmail,
          questionnaireVersion: application.questionnaireVersion,
          requirementsComplete:
            application.requirementsCompletedAt !== null && application.waiverId !== null,
          reviewStatus: application.reviewStatus,
          targetLabel: quarter?.school ?? `quarter ${application.targetExpireQtr}`,
        },
      }
    } catch (error) {
      console.error('Failed to load membership application:', { applicationId, error })
      throw new Error('Could not load the membership application')
    }
  })

function questionnaireVersion(value: string): NewMemberQuestionnaireVersion {
  if (value in newMemberQuestionnaireVersions) return value as NewMemberQuestionnaireVersion
  throw new Error('Unsupported questionnaire version')
}

export const completeNewMemberApplication = createServerFn({ method: 'POST' })
  .inputValidator((input: z.input<typeof completionInputSchema>) =>
    completionInputSchema.parse(input),
  )
  .handler(async ({ data }) => {
    const isMock = isDevEnvironment()
    if (isMock && !data.testAcknowledged) {
      return { success: false as const, message: 'Mock waiver acknowledgement is required.' }
    }

    let application:
      | {
          closedAt: Date | null
          firstName: string
          lastName: string
          paymentStatus: string
          primaryEmail: string
          questionnaireVersion: string
          requirementsCompletedAt: Date | null
          reviewStatus: string
        }
      | undefined
    try {
      const rows = await db
        .select({
          closedAt: membershipApplications.closedAt,
          firstName: membershipApplications.firstName,
          lastName: membershipApplications.lastName,
          paymentStatus: membershipApplications.paymentStatus,
          primaryEmail: membershipApplications.primaryEmail,
          questionnaireVersion: membershipApplications.questionnaireVersion,
          requirementsCompletedAt: membershipApplications.requirementsCompletedAt,
          reviewStatus: membershipApplications.reviewStatus,
        })
        .from(membershipApplications)
        .where(eq(membershipApplications.id, data.applicationId))
        .limit(1)
      application = rows[0]
    } catch (error) {
      console.error('Failed to load application for completion:', {
        applicationId: data.applicationId,
        error,
      })
      return { success: false as const, message: 'The application could not be loaded.' }
    }

    if (!application) return { success: false as const, message: 'Application not found.' }
    if (!canCompleteMembershipApplication(application.paymentStatus)) {
      return {
        success: false as const,
        message: 'This application is not ready for completion.',
      }
    }
    if (application.requirementsCompletedAt) {
      return { success: true as const, alreadySubmitted: true as const }
    }
    if (application.closedAt || application.reviewStatus !== 'not_ready') {
      return { success: false as const, message: 'This application is closed.' }
    }

    let responses
    try {
      responses = parseNewMemberQuestionnaire(
        questionnaireVersion(application.questionnaireVersion),
        data.questionnaire,
      )
    } catch (error) {
      console.error('Invalid new-member questionnaire response:', {
        applicationId: data.applicationId,
        error,
      })
      return { success: false as const, message: 'Please check the questionnaire responses.' }
    }

    const acceptanceId = randomUUID()
    const signedAt = new Date().toISOString()
    const objectKey = isMock
      ? `mock/member/${acceptanceId}.pdf`
      : `waivers/v1/member/${signedAt.slice(0, 4)}/${acceptanceId}.pdf`
    const filename = `${isMock ? 'mock-' : ''}wyc-member-waiver-${acceptanceId}.pdf`

    try {
      const pdf = await createMemberWaiverPdf({
        acceptanceId,
        adultAcknowledged: data.adultAcknowledged,
        applicationId: data.applicationId,
        email: application.primaryEmail,
        firstName: application.firstName,
        isMock,
        lastName: application.lastName,
        signatureDataUrl: data.signatureDataUrl,
        signedAt,
        testAcknowledged: data.testAcknowledged,
      })
      const sha256 = createHash('sha256').update(pdf).digest('hex')

      await uploadWaiverPdf({
        acceptanceId,
        body: pdf,
        filename,
        key: objectKey,
        sha256,
      })

      let alreadySubmitted = false
      await db.transaction(async (tx) => {
        const [current] = await tx
          .select({
            closedAt: membershipApplications.closedAt,
            paymentStatus: membershipApplications.paymentStatus,
            requirementsCompletedAt: membershipApplications.requirementsCompletedAt,
            reviewStatus: membershipApplications.reviewStatus,
          })
          .from(membershipApplications)
          .where(eq(membershipApplications.id, data.applicationId))
          .for('update')
        if (!current || !canCompleteMembershipApplication(current.paymentStatus)) {
          throw new Error('Application is not eligible for completion')
        }
        if (current.requirementsCompletedAt) {
          alreadySubmitted = true
          return
        }
        if (current.closedAt || current.reviewStatus !== 'not_ready') {
          throw new Error('Application is closed')
        }

        await tx.insert(memberWaivers).values({
          applicationId: data.applicationId,
          email: application.primaryEmail,
          firstName: application.firstName,
          id: acceptanceId,
          lastName: application.lastName,
          objectKey,
          pdfContentType: 'application/pdf',
          pdfSha256: sha256,
          pdfSize: pdf.byteLength,
          renewalId: null,
          signedAt: new Date(signedAt),
          submittedValues: isMock
            ? { adultAcknowledged: true, testAcknowledged: true }
            : { adultAcknowledged: true },
          waiverVersion: memberWaiverVersion,
        })
        await tx
          .update(membershipApplications)
          .set({
            ...data.contact,
            questionnaireResponses: responses,
            requirementsCompletedAt: new Date(),
            reviewStatus: 'pending_review',
          })
          .where(
            and(
              eq(membershipApplications.id, data.applicationId),
              eq(membershipApplications.reviewStatus, 'not_ready'),
              isNull(membershipApplications.closedAt),
              isNull(membershipApplications.requirementsCompletedAt),
            ),
          )
      })

      return {
        success: true as const,
        alreadySubmitted,
        ...(isMock && { acceptanceId, objectKey, sha256, size: pdf.byteLength }),
      }
    } catch (error) {
      console.error('New-member application completion failed:', {
        applicationId: data.applicationId,
        error,
      })
      const [stored] = await db
        .select({ completedAt: membershipApplications.requirementsCompletedAt })
        .from(membershipApplications)
        .where(eq(membershipApplications.id, data.applicationId))
        .limit(1)
      if (stored?.completedAt) return { success: true as const, alreadySubmitted: true as const }
      return {
        success: false as const,
        message: 'Your information and waiver could not be stored. Please try again.',
      }
    }
  })
