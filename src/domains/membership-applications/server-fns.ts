import { atomicWrite } from '@/db/atomic'
import { readQuarterConfig } from '@/domains/quarters/config'
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
import { computeRenewal } from '@/domains/renewals/compute-renewal'
import { tierForUwStatus } from '@/domains/renewals/questionnaire'
import { isDevEnvironment } from '@/lib/env'
import { discordUsernameSchema, normalizeDiscordUsername } from '@/lib/discord'
import { createMemberWaiverPdf } from '../waivers/member-waiver-pdf'
import { memberWaiverVersion } from '../waivers/member-waiver-content'
import { uploadWaiverPdf } from '../waivers/r2'
import {
  newMemberQuestionnaireVersions,
  parseNewMemberQuestionnaire,
  type NewMemberQuestionnaireVersion,
} from './questionnaire'
import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import {
  readCheckoutDraft,
  editableDraft,
  discardDraft,
  updateCheckoutDraft,
} from './checkout-drafts'
import {
  applicationIdSchema,
  emailSchema,
  requiredText,
  applicantInputShape,
  parseApplicantInput,
  requireStudentUwEmail,
  createMembershipApplication,
  parseTier,
  parseDuration,
} from './application-store'
import { and, eq, gte, isNull, sql } from 'drizzle-orm'
import { createHash, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { sendApplicationCompletionEmail } from './email'
import { canCompleteMembershipApplication } from './funding'

const paymentInputSchema = z
  .object({
    ...applicantInputShape,
    duration: z.enum(['quarterly', 'annual']),
    discountCode: z.unknown().optional(),
    sourceId: requiredText(2_000),
    draftId: applicationIdSchema.optional(),
  })
  .transform((input) => ({
    ...parseApplicantInput(input),
    discountCode: parseDiscountCodeSelection(input.discountCode),
  }))
  .superRefine(requireStudentUwEmail)

const exemptionInputSchema = z
  .object({ ...applicantInputShape, draftId: applicationIdSchema.optional() })
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
      discordUsername: discordUsernameSchema.transform(normalizeDiscordUsername).optional(),
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

export const getCheckoutDraft = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    setResponseHeader('Cache-Control', 'private, no-store')
    return await readCheckoutDraft()
  } catch (error) {
    console.error('Failed to load checkout draft', error)
    throw new Error('Could not load checkout.')
  }
})

export const discardCheckoutDraft = createServerFn({ method: 'POST' })
  .validator((id: string) => applicationIdSchema.parse(id))
  .handler(async ({ data: id }) => {
    return discardDraft(id)
  })

export const checkNewMemberEmail = createServerFn({ method: 'POST' })
  .validator((input: { email: string }) => emailSchema.parse(input.email))
  .handler(async ({ data: email }) => {
    try {
      const [member] = await db
        .select({ wycNumber: wycDatabase.wycNumber })
        .from(wycDatabase)
        .where(sql`lower(trim(${wycDatabase.email})) = ${email.trim().toLowerCase()}`)
        .limit(1)
      return { existingMember: Boolean(member) }
    } catch (error) {
      console.error('Failed to check new-member email:', error)
      throw new Error('Could not check the email address')
    }
  })

export const getNewMemberSignupOptions = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const { renewalQuarter } = await readQuarterConfig()
    const targets = {
      annual: computeRenewal(0, 'annual', renewalQuarter),
      quarterly: computeRenewal(0, 'quarterly', renewalQuarter),
    }
    const rows = await db
      .select({ index: quarters.index, school: quarters.school })
      .from(quarters)
      .where(gte(quarters.index, renewalQuarter))
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
  .validator((input: { duration: string; tier: string }) => ({
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
  .validator((input: z.input<typeof exemptionInputSchema>) => exemptionInputSchema.parse(input))
  .handler(async ({ data }) => {
    let application
    if (data.draftId) {
      try {
        await updateCheckoutDraft(
          { ...data, editId: data.draftId, duration: 'quarterly' },
          'exemption_requested',
        )
      } catch (error) {
        console.error('Failed to request exemption for checkout', error)
        throw new Error(
          'Could not request a dues exemption. Refresh your signup before trying again.',
        )
      }
      application = { success: true as const, applicationId: data.draftId }
    } else {
      application = await createMembershipApplication(data, 'quarterly', 'exemption_requested')
    }
    if (!application.success) return application

    let email = { emailSent: false, emailSimulated: false }
    try {
      email = await sendApplicationCompletionEmail({
        applicationId: application.applicationId,
        firstName: data.firstName,
        lastName: data.lastName,
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
  .validator((input: z.input<typeof paymentInputSchema>) => paymentInputSchema.parse(input))
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
    let applicationId: string
    let targetExpireQtr: number
    if (data.draftId) {
      try {
        const draft = await readCheckoutDraft()
        if (!draft || draft.id !== data.draftId || draft.paymentStatus !== 'draft')
          throw new Error('This checkout is no longer available. Refresh to see its status.')
        const table = membershipApplications
        const claim = await db
          .update(table)
          .set({ paymentStatus: 'pending' })
          .where(
            and(
              editableDraft(draft.id),
              eq(table.firstName, data.firstName),
              eq(table.lastName, data.lastName),
              eq(table.primaryEmail, data.primaryEmail),
              data.uwEmail ? eq(table.uwEmail, data.uwEmail) : isNull(table.uwEmail),
              eq(table.duration, data.duration),
              eq(table.uwStatus, data.questionnaire.uwStatus),
              eq(table.plusOneResponse, data.questionnaire.plusOneResponse),
            ),
          )
        if (claim.meta.changes !== 1) throw new Error('Checkout changed')
        applicationId = draft.id
        targetExpireQtr = draft.targetExpireQtr
      } catch (error) {
        console.error('Failed to claim checkout', error)
        throw new Error('Checkout changed. Refresh before continuing.')
      }
    } else {
      const application = await createMembershipApplication(data, data.duration, 'pending')
      if (!application.success) return application
      applicationId = application.applicationId
      targetExpireQtr = application.targetExpireQtr
    }
    const retryStatus = data.draftId ? 'draft' : 'failed'
    const attempt = createHash('sha256')
      .update(`${applicationId}/${data.sourceId}`)
      .digest('hex')
      .slice(0, 32)

    let order: Awaited<ReturnType<typeof createMembershipOrder>>
    try {
      order = await createMembershipOrder({
        discount: discountCode,
        duration: data.duration,
        idempotencyKey: `join-o/${data.draftId ? attempt : applicationId}`,
        tier,
      })
      await db
        .update(membershipApplications)
        .set({ squareOrderId: order.orderId })
        .where(eq(membershipApplications.id, applicationId))
    } catch (error) {
      console.error('Failed to create new-member Square order:', { applicationId, error })
      await updatePaymentStatus(applicationId, retryStatus)
      return {
        success: false as const,
        retryAllowed: true as const,
        message: 'We could not start your payment. Please try again.',
      }
    }

    const paymentIdempotencyKey = `join-p/${attempt}`
    try {
      await db
        .update(membershipApplications)
        .set({ paymentIdempotencyKey })
        .where(eq(membershipApplications.id, applicationId))
    } catch (error) {
      console.error('Failed to store new-member payment attempt:', { applicationId, error })
      await updatePaymentStatus(applicationId, retryStatus)
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
      await updatePaymentStatus(applicationId, retryStatus)
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
      await atomicWrite(async (tx) => {
        const [application] = await db
          .select({ paymentStatus: membershipApplications.paymentStatus })
          .from(membershipApplications)
          .where(eq(membershipApplications.id, applicationId))
        if (!application || application.paymentStatus !== 'pending') {
          throw new Error('Application payment state changed')
        }

        const paymentId = await tx.nextId(membershipPayments)
        tx.add(
          db.insert(membershipPayments).values({
            index: paymentId,
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
          }),
        )
        if (discountCode) {
          await insertMembershipDiscountCodeRedemption(tx, {
            discountCents: order.discountCents,
            finalCents: order.amountCents,
            paymentId,
            discountCode,
            subtotalCents: order.subtotalCents,
          })
        }
        tx.add(
          db
            .update(membershipApplications)
            .set({ paymentCompletedAt: new Date(), paymentStatus: 'completed' })
            .where(eq(membershipApplications.id, applicationId)),
        )
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
  .validator((input: { applicationId: string }) => String(input.applicationId))
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
  .validator((input: z.input<typeof completionInputSchema>) => completionInputSchema.parse(input))
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
      await atomicWrite(async (tx) => {
        const [current] = await db
          .select({
            closedAt: membershipApplications.closedAt,
            paymentStatus: membershipApplications.paymentStatus,
            requirementsCompletedAt: membershipApplications.requirementsCompletedAt,
            reviewStatus: membershipApplications.reviewStatus,
          })
          .from(membershipApplications)
          .where(eq(membershipApplications.id, data.applicationId))
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

        tx.add(
          db.insert(memberWaivers).values({
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
          }),
        )
        tx.add(
          db
            .update(membershipApplications)
            .set({
              ...data.contact,
              discordUsername: data.contact.discordUsername || null,
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
