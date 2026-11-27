import { readQuarterConfig } from '@/domains/quarters/config'
import db from '@/db'
import { membershipApplications } from '@/db/schema'
import { and, count, eq, gte } from 'drizzle-orm'
import { getRequest } from '@tanstack/react-start/server'
import { createHmac, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { computeRenewal, type RenewalDuration, type RenewalTier } from '../renewals/compute-renewal'
import { parseQuestionnaire, tierForUwStatus } from '../renewals/questionnaire'
import { CURRENT_NEW_MEMBER_QUESTIONNAIRE_VERSION } from './questionnaire'

const APPLICATION_RATE_WINDOW_MS = 30 * 60 * 1000
const MAX_APPLICATIONS_PER_WINDOW = 8
export const applicationIdSchema = z.uuid()
export const emailSchema = z.string().trim().email().max(254)
export const requiredText = (max: number) => z.string().trim().min(1).max(max)

export const applicantInputShape = {
  firstName: requiredText(60),
  lastName: requiredText(60),
  primaryEmail: emailSchema,
  questionnaire: z.unknown(),
  uwEmail: z.union([emailSchema, z.literal('')]).optional(),
}

export function parseApplicantInput<T extends z.output<z.ZodObject<typeof applicantInputShape>>>(
  input: T,
) {
  return {
    ...input,
    questionnaire: parseQuestionnaire(input.questionnaire),
    uwEmail: input.uwEmail || null,
  }
}

export function requireStudentUwEmail(
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

function hashRequestIp(): string {
  if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is not set')
  const ip = getRequest().headers.get('CF-Connecting-IP') ?? 'unknown'
  return createHmac('sha256', process.env.SESSION_SECRET).update(ip).digest('hex')
}

export function parseTier(value: unknown): RenewalTier {
  if (value === 'student' || value === 'nonstudent') return value
  throw new Error('Invalid membership tier')
}

export function parseDuration(value: unknown): RenewalDuration {
  if (value === 'quarterly' || value === 'annual') return value
  throw new Error('Invalid membership duration')
}

type ApplicantInput = ReturnType<typeof parseApplicantInput>

export async function createMembershipApplication(
  input: ApplicantInput,
  duration: RenewalDuration,
  paymentStatus: 'draft' | 'pending' | 'exemption_requested',
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
  const targetExpireQtr = computeRenewal(0, duration, (await readQuarterConfig()).renewalQuarter)
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
