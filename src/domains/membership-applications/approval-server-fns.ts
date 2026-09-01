import db from '@/db'
import {
  memberEmergencyContacts,
  memberWaivers,
  membershipApplications,
  membershipPayments,
  quarters,
  wycDatabase,
} from '@/db/schema'
import { allocateWycNumber, createMemberCredentials } from '@/domains/members/member-write'
import { categoryIdForUwStatus, isUwStatus } from '@/domains/renewals/questionnaire'
import { requirePrivilege } from '@/lib/auth/auth-middleware'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq, inArray, isNull, or } from 'drizzle-orm'
import { z } from 'zod'
import {
  sendApplicationCompletionEmail,
  sendExistingMemberApplicationEmail,
  sendNewMemberWelcomeEmail,
} from './email'
import type { NewMemberQuestionnaireSnapshot } from './questionnaire'

const applicationIdSchema = z.uuid()
const emailSchema = z.string().trim().email().max(254)

type MatchSource = {
  firstName: string
  lastName: string
  phone: string | null
  primaryEmail: string
}

type MemberMatchCandidate = {
  email: string | null
  expireQtrIndex: number
  firstName: string | null
  lastName: string | null
  phone1: string | null
  phone2: string | null
  wycNumber: number
}

const memberMatchSelect = {
  email: wycDatabase.email,
  expireQtrIndex: wycDatabase.expireQtrIndex,
  firstName: wycDatabase.first,
  lastName: wycDatabase.last,
  phone1: wycDatabase.phone1,
  phone2: wycDatabase.phone2,
  wycNumber: wycDatabase.wycNumber,
}

function normalizedName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function normalizedPhone(value: string | null): string {
  const digits = value?.replace(/\D/g, '') ?? ''
  if (digits.length < 7) return ''
  return digits.length > 10 ? digits.slice(-10) : digits
}

function findMemberMatches(source: MatchSource, candidates: MemberMatchCandidate[]) {
  const sourceEmail = source.primaryEmail.trim().toLowerCase()
  const sourceFirstName = normalizedName(source.firstName)
  const sourceLastName = normalizedName(source.lastName)
  const sourcePhone = normalizedPhone(source.phone)
  return candidates
    .flatMap((candidate) => {
      const reasons: string[] = []
      if (candidate.email?.trim().toLowerCase() === sourceEmail) reasons.push('Same email')
      if (
        sourceFirstName &&
        sourceLastName &&
        normalizedName(candidate.firstName ?? '') === sourceFirstName &&
        normalizedName(candidate.lastName ?? '') === sourceLastName
      ) {
        reasons.push('Same name')
      }
      if (
        sourcePhone &&
        [normalizedPhone(candidate.phone1), normalizedPhone(candidate.phone2)].includes(sourcePhone)
      ) {
        reasons.push('Same phone')
      }
      return reasons.length > 0 ? [{ ...candidate, reasons }] : []
    })
    .slice(0, 20)
}

function combineAddress(line1: string, line2: string | null): string {
  const address = [line1, line2].filter(Boolean).join(', ')
  if (address.length > 100) throw new Error('Member address is too long')
  return address
}

async function recordWelcomeDelivery(applicationId: string) {
  try {
    await db
      .update(membershipApplications)
      .set({ welcomeEmailSentAt: new Date() })
      .where(eq(membershipApplications.id, applicationId))
  } catch (error) {
    console.error('Failed to record application welcome email:', { applicationId, error })
  }
}

export const listMembershipApplicationsForApproval = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requirePrivilege('db')
    try {
      const rows = await db
        .select({
          addressLine1: membershipApplications.addressLine1,
          addressLine2: membershipApplications.addressLine2,
          applicationId: membershipApplications.id,
          city: membershipApplications.city,
          createdAt: membershipApplications.createdAt,
          duration: membershipApplications.duration,
          emergencyFirstName: membershipApplications.emergencyFirstName,
          emergencyLastName: membershipApplications.emergencyLastName,
          emergencyPhone: membershipApplications.emergencyPhone,
          emergencyRelationship: membershipApplications.emergencyRelationship,
          firstName: membershipApplications.firstName,
          lastName: membershipApplications.lastName,
          paymentAmountCents: membershipPayments.amountCents,
          paymentCompletedAt: membershipApplications.paymentCompletedAt,
          paymentStatus: membershipApplications.paymentStatus,
          phone: membershipApplications.phone,
          primaryEmail: membershipApplications.primaryEmail,
          questionnaireResponses: membershipApplications.questionnaireResponses,
          requirementsCompletedAt: membershipApplications.requirementsCompletedAt,
          resolvedWycNumber: membershipApplications.resolvedWycNumber,
          reviewStatus: membershipApplications.reviewStatus,
          squareOrderId: membershipApplications.squareOrderId,
          squarePaymentId: membershipPayments.squarePaymentId,
          state: membershipApplications.state,
          submittedPrimaryEmail: membershipApplications.submittedPrimaryEmail,
          submittedUwEmail: membershipApplications.submittedUwEmail,
          targetExpireQtr: membershipApplications.targetExpireQtr,
          targetLabel: quarters.school,
          tier: membershipApplications.tier,
          uwEmail: membershipApplications.uwEmail,
          uwStatus: membershipApplications.uwStatus,
          waiverId: memberWaivers.id,
          waiverObjectKey: memberWaivers.objectKey,
          waiverSignedAt: memberWaivers.signedAt,
          welcomeEmailSentAt: membershipApplications.welcomeEmailSentAt,
          zipCode: membershipApplications.zipCode,
        })
        .from(membershipApplications)
        .leftJoin(
          membershipPayments,
          eq(membershipPayments.applicationId, membershipApplications.id),
        )
        .leftJoin(memberWaivers, eq(memberWaivers.applicationId, membershipApplications.id))
        .leftJoin(quarters, eq(quarters.index, membershipApplications.targetExpireQtr))
        .where(
          or(
            and(
              inArray(membershipApplications.paymentStatus, [
                'completed',
                'reconciliation_required',
              ]),
              inArray(membershipApplications.reviewStatus, ['not_ready', 'pending_review']),
            ),
            and(
              inArray(membershipApplications.reviewStatus, ['approved_new', 'approved_existing']),
              isNull(membershipApplications.welcomeEmailSentAt),
            ),
          ),
        )
        .orderBy(membershipApplications.createdAt)
      const memberCandidates = await db.select(memberMatchSelect).from(wycDatabase)

      return rows.map((row) => ({
        ...row,
        questionnaireResponses:
          row.questionnaireResponses && typeof row.questionnaireResponses === 'object'
            ? (row.questionnaireResponses as NewMemberQuestionnaireSnapshot)
            : null,
        matches: findMemberMatches(
          {
            firstName: row.firstName,
            lastName: row.lastName,
            phone: row.phone,
            primaryEmail: row.primaryEmail,
          },
          memberCandidates,
        ),
        requirementsComplete: row.requirementsCompletedAt !== null && row.waiverId !== null,
        targetLabel: row.targetLabel ?? `quarter ${row.targetExpireQtr}`,
      }))
    } catch (error) {
      console.error('Failed to list membership applications for approval:', error)
      throw new Error('Could not load membership applications')
    }
  },
)

export const updateMembershipApplicationEmails = createServerFn({ method: 'POST' })
  .inputValidator((input) =>
    z
      .object({
        applicationId: applicationIdSchema,
        primaryEmail: emailSchema,
        uwEmail: z.union([emailSchema, z.literal(''), z.null()]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const editor = await requirePrivilege('db')
    try {
      await db.transaction(async (tx) => {
        const [application] = await tx
          .select({
            reviewStatus: membershipApplications.reviewStatus,
            uwStatus: membershipApplications.uwStatus,
          })
          .from(membershipApplications)
          .where(eq(membershipApplications.id, data.applicationId))
          .for('update')
        if (!application || !['not_ready', 'pending_review'].includes(application.reviewStatus)) {
          throw new Error('Application is not editable')
        }
        const uwEmail = data.uwEmail || null
        if (application.uwStatus === 'student' && !uwEmail) {
          throw new Error('UW email is required for students')
        }
        await tx
          .update(membershipApplications)
          .set({
            emailEditedAt: new Date(),
            emailEditedBy: editor,
            primaryEmail: data.primaryEmail,
            uwEmail,
          })
          .where(eq(membershipApplications.id, data.applicationId))
      })
      return { success: true as const }
    } catch (error) {
      console.error('Failed to update membership application email:', {
        applicationId: data.applicationId,
        error,
      })
      throw new Error('Could not update the application email')
    }
  })

export const resendMembershipApplicationCompletionEmail = createServerFn({ method: 'POST' })
  .inputValidator((input: { applicationId: string }) =>
    applicationIdSchema.parse(input.applicationId),
  )
  .handler(async ({ data: applicationId }) => {
    await requirePrivilege('db')
    const [application] = await db
      .select({
        firstName: membershipApplications.firstName,
        lastName: membershipApplications.lastName,
        paymentStatus: membershipApplications.paymentStatus,
        primaryEmail: membershipApplications.primaryEmail,
        requirementsCompletedAt: membershipApplications.requirementsCompletedAt,
        reviewStatus: membershipApplications.reviewStatus,
      })
      .from(membershipApplications)
      .where(eq(membershipApplications.id, applicationId))
      .limit(1)
    if (
      !application ||
      application.paymentStatus !== 'completed' ||
      application.requirementsCompletedAt ||
      application.reviewStatus !== 'not_ready'
    ) {
      throw new Error('This application is not waiting for completion')
    }

    try {
      return await sendApplicationCompletionEmail({
        applicationId,
        firstName: application.firstName,
        lastName: application.lastName,
        origin: getRequest().url,
        primaryEmail: application.primaryEmail,
        type: 'resend',
      })
    } catch (error) {
      console.error('Failed to resend membership application completion email:', {
        applicationId,
        error,
      })
      throw new Error('Could not send the completion email')
    }
  })

export const approveNewMembershipApplication = createServerFn({ method: 'POST' })
  .inputValidator((input) =>
    z
      .object({
        applicationId: applicationIdSchema,
        confirmPossibleMatches: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const reviewer = await requirePrivilege('db')
    const credentials = await createMemberCredentials()
    let member:
      | { email: string; firstName: string; lastName: string; wycNumber: number }
      | undefined

    try {
      await db.transaction(async (tx) => {
        const [application] = await tx
          .select()
          .from(membershipApplications)
          .where(eq(membershipApplications.id, data.applicationId))
          .for('update')
        if (
          !application ||
          application.paymentStatus !== 'completed' ||
          application.reviewStatus !== 'pending_review' ||
          !application.requirementsCompletedAt
        ) {
          throw new Error('Application is not ready for approval')
        }
        if (!isUwStatus(application.uwStatus)) throw new Error('Invalid UW status')

        const [waiver] = await tx
          .select({ id: memberWaivers.id })
          .from(memberWaivers)
          .where(eq(memberWaivers.applicationId, data.applicationId))
          .for('update')
        const [payment] = await tx
          .select({ index: membershipPayments.index })
          .from(membershipPayments)
          .where(eq(membershipPayments.applicationId, data.applicationId))
          .for('update')
        if (!waiver || !payment) throw new Error('Application records are incomplete')

        const memberCandidates = await tx.select(memberMatchSelect).from(wycDatabase)
        const [possibleMatch] = findMemberMatches(
          {
            firstName: application.firstName,
            lastName: application.lastName,
            phone: application.phone,
            primaryEmail: application.primaryEmail,
          },
          memberCandidates,
        )
        if (possibleMatch && !data.confirmPossibleMatches) {
          throw new Error('A possible member match requires confirmation')
        }

        if (
          !application.addressLine1 ||
          !application.city ||
          !application.state ||
          !application.zipCode ||
          !application.phone ||
          !application.emergencyFirstName ||
          !application.emergencyLastName ||
          !application.emergencyPhone ||
          !application.emergencyRelationship
        ) {
          throw new Error('Application contact information is incomplete')
        }

        const wycNumber = await allocateWycNumber(tx)
        await tx.insert(wycDatabase).values({
          categoryId: categoryIdForUwStatus(application.uwStatus),
          city: application.city,
          email: application.primaryEmail,
          expireQtrIndex: application.targetExpireQtr,
          first: application.firstName,
          last: application.lastName,
          outToSea: 0,
          password: credentials.legacyHash,
          passwordArgon2: credentials.passwordArgon2,
          phone1: application.phone,
          phone2: '',
          state: application.state,
          streetAddress: combineAddress(application.addressLine1, application.addressLine2),
          studentId: null,
          uwEmail: application.uwEmail,
          wycNumber,
          zipCode: application.zipCode,
        })
        await tx.insert(memberEmergencyContacts).values({
          firstName: application.emergencyFirstName,
          lastName: application.emergencyLastName,
          phone: application.emergencyPhone,
          relationship: application.emergencyRelationship,
          wycNumber,
        })
        await tx
          .update(membershipPayments)
          .set({ wycNumber })
          .where(eq(membershipPayments.applicationId, data.applicationId))
        await tx
          .update(membershipApplications)
          .set({
            resolvedWycNumber: wycNumber,
            reviewedAt: new Date(),
            reviewedBy: reviewer,
            reviewStatus: 'approved_new',
          })
          .where(eq(membershipApplications.id, data.applicationId))

        member = {
          email: application.primaryEmail,
          firstName: application.firstName,
          lastName: application.lastName,
          wycNumber,
        }
      })
    } catch (error) {
      console.error('Failed to approve new membership application:', {
        applicationId: data.applicationId,
        error,
      })
      throw new Error('Could not approve the membership application')
    }

    let emailSent = false
    let emailSimulated = false
    try {
      const delivery = await sendNewMemberWelcomeEmail({
        applicationId: data.applicationId,
        ...member!,
      })
      emailSent = delivery.emailSent
      emailSimulated = delivery.emailSimulated
      await recordWelcomeDelivery(data.applicationId)
    } catch (error) {
      console.error('Failed to send approved new-member welcome email:', {
        applicationId: data.applicationId,
        error,
      })
    }
    return { success: true as const, wycNumber: member!.wycNumber, emailSent, emailSimulated }
  })

export const applyMembershipApplicationToExistingMember = createServerFn({ method: 'POST' })
  .inputValidator((input) =>
    z
      .object({ applicationId: applicationIdSchema, wycNumber: z.number().int().positive() })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const reviewer = await requirePrivilege('db')
    let notification:
      | {
          email: string
          expiryLabel: string
          firstName: string
          lastName: string
          wycNumber: number
        }
      | undefined

    try {
      await db.transaction(async (tx) => {
        const [application] = await tx
          .select()
          .from(membershipApplications)
          .where(eq(membershipApplications.id, data.applicationId))
          .for('update')
        const [existingMember] = await tx
          .select({
            expireQtrIndex: wycDatabase.expireQtrIndex,
            firstName: wycDatabase.first,
            lastName: wycDatabase.last,
          })
          .from(wycDatabase)
          .where(eq(wycDatabase.wycNumber, data.wycNumber))
          .for('update')
        if (
          !application ||
          !existingMember ||
          application.paymentStatus !== 'completed' ||
          application.reviewStatus !== 'pending_review' ||
          !application.requirementsCompletedAt
        ) {
          throw new Error('Application is not ready for resolution')
        }
        const [waiver] = await tx
          .select({ id: memberWaivers.id })
          .from(memberWaivers)
          .where(eq(memberWaivers.applicationId, data.applicationId))
          .for('update')
        const [payment] = await tx
          .select({ index: membershipPayments.index })
          .from(membershipPayments)
          .where(eq(membershipPayments.applicationId, data.applicationId))
          .for('update')
        if (!waiver || !payment) throw new Error('Application records are incomplete')
        if (
          !application.addressLine1 ||
          !application.city ||
          !application.state ||
          !application.zipCode ||
          !application.phone ||
          !application.emergencyFirstName ||
          !application.emergencyLastName ||
          !application.emergencyPhone ||
          !application.emergencyRelationship
        ) {
          throw new Error('Application contact information is incomplete')
        }

        const expireQtrIndex = Math.max(existingMember.expireQtrIndex, application.targetExpireQtr)
        await tx
          .update(wycDatabase)
          .set({
            city: application.city,
            email: application.primaryEmail,
            expireQtrIndex,
            phone1: application.phone,
            state: application.state,
            streetAddress: combineAddress(application.addressLine1, application.addressLine2),
            uwEmail: application.uwEmail,
            zipCode: application.zipCode,
          })
          .where(eq(wycDatabase.wycNumber, data.wycNumber))
        await tx
          .insert(memberEmergencyContacts)
          .values({
            firstName: application.emergencyFirstName,
            lastName: application.emergencyLastName,
            phone: application.emergencyPhone,
            relationship: application.emergencyRelationship,
            wycNumber: data.wycNumber,
          })
          .onDuplicateKeyUpdate({
            set: {
              firstName: application.emergencyFirstName,
              lastName: application.emergencyLastName,
              phone: application.emergencyPhone,
              relationship: application.emergencyRelationship,
            },
          })
        await tx
          .update(membershipPayments)
          .set({ wycNumber: data.wycNumber })
          .where(eq(membershipPayments.applicationId, data.applicationId))
        await tx
          .update(membershipApplications)
          .set({
            resolvedWycNumber: data.wycNumber,
            reviewedAt: new Date(),
            reviewedBy: reviewer,
            reviewStatus: 'approved_existing',
          })
          .where(eq(membershipApplications.id, data.applicationId))
        const [quarter] = await tx
          .select({ label: quarters.school })
          .from(quarters)
          .where(eq(quarters.index, expireQtrIndex))
          .limit(1)
        notification = {
          email: application.primaryEmail,
          expiryLabel: quarter?.label ?? `quarter ${expireQtrIndex}`,
          firstName: existingMember.firstName ?? application.firstName,
          lastName: existingMember.lastName ?? application.lastName,
          wycNumber: data.wycNumber,
        }
      })
    } catch (error) {
      console.error('Failed to apply membership application to existing member:', {
        applicationId: data.applicationId,
        wycNumber: data.wycNumber,
        error,
      })
      throw new Error('Could not apply the application to the selected member')
    }

    let emailSent = false
    let emailSimulated = false
    try {
      const delivery = await sendExistingMemberApplicationEmail({
        applicationId: data.applicationId,
        ...notification!,
      })
      emailSent = delivery.emailSent
      emailSimulated = delivery.emailSimulated
      await recordWelcomeDelivery(data.applicationId)
    } catch (error) {
      console.error('Failed to send existing-member application email:', {
        applicationId: data.applicationId,
        error,
      })
    }
    return { success: true as const, wycNumber: data.wycNumber, emailSent, emailSimulated }
  })

export const closeMembershipApplication = createServerFn({ method: 'POST' })
  .inputValidator((input) =>
    z
      .object({ applicationId: applicationIdSchema, note: z.string().trim().max(1_000) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const reviewer = await requirePrivilege('db')
    try {
      const result = await db
        .update(membershipApplications)
        .set({
          closedAt: new Date(),
          reviewedAt: new Date(),
          reviewedBy: reviewer,
          reviewNote: data.note || null,
          reviewStatus: 'closed',
        })
        .where(
          and(
            eq(membershipApplications.id, data.applicationId),
            inArray(membershipApplications.reviewStatus, ['not_ready', 'pending_review']),
          ),
        )
      if (result[0].affectedRows !== 1) throw new Error('Application is no longer open')
      return { success: true as const }
    } catch (error) {
      console.error('Failed to close membership application:', {
        applicationId: data.applicationId,
        error,
      })
      throw new Error('Could not close the membership application')
    }
  })

export const retryMembershipApplicationWelcomeEmail = createServerFn({ method: 'POST' })
  .inputValidator((input: { applicationId: string }) =>
    applicationIdSchema.parse(input.applicationId),
  )
  .handler(async ({ data: applicationId }) => {
    await requirePrivilege('db')
    const [application] = await db
      .select({
        firstName: membershipApplications.firstName,
        lastName: membershipApplications.lastName,
        primaryEmail: membershipApplications.primaryEmail,
        resolvedWycNumber: membershipApplications.resolvedWycNumber,
        reviewStatus: membershipApplications.reviewStatus,
        targetExpireQtr: membershipApplications.targetExpireQtr,
        welcomeEmailSentAt: membershipApplications.welcomeEmailSentAt,
      })
      .from(membershipApplications)
      .where(eq(membershipApplications.id, applicationId))
      .limit(1)
    if (!application?.resolvedWycNumber || !application.reviewStatus.startsWith('approved_')) {
      throw new Error('This application has not been approved')
    }
    if (application.welcomeEmailSentAt) {
      return { success: true as const, alreadySent: true as const }
    }

    try {
      let delivery
      if (application.reviewStatus === 'approved_new') {
        delivery = await sendNewMemberWelcomeEmail({
          applicationId,
          email: application.primaryEmail,
          firstName: application.firstName,
          lastName: application.lastName,
          wycNumber: application.resolvedWycNumber,
        })
      } else {
        const [quarter] = await db
          .select({ label: quarters.school })
          .from(quarters)
          .where(eq(quarters.index, application.targetExpireQtr))
          .limit(1)
        delivery = await sendExistingMemberApplicationEmail({
          applicationId,
          email: application.primaryEmail,
          expiryLabel: quarter?.label ?? `quarter ${application.targetExpireQtr}`,
          firstName: application.firstName,
          lastName: application.lastName,
          wycNumber: application.resolvedWycNumber,
        })
      }
      await recordWelcomeDelivery(applicationId)
      return { success: true as const, ...delivery }
    } catch (error) {
      console.error('Failed to retry membership application welcome email:', {
        applicationId,
        error,
      })
      throw new Error('Could not send the membership email')
    }
  })
