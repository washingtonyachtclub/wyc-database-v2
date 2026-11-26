import { readQuarterConfig } from '@/domains/quarters/config'
import db from '@/db'
import { membershipApplications, quarters } from '@/db/schema'
import { getCookie, setCookie, deleteCookie } from '@tanstack/react-start/server'
import { eq, and, gte, lt, count, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { parseQuestionnaire, tierForUwStatus } from '../renewals/questionnaire'
import { computeRenewal } from '../renewals/compute-renewal'
import {
  applicationIdSchema,
  applicantInputShape,
  parseApplicantInput,
  requireStudentUwEmail,
  createMembershipApplication,
  parseDuration,
} from './application-store'

const draftCookie = 'wyc_join_draft'
const draftLifetime = 7 * 24 * 60 * 60
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
}

function draftCutoff() {
  return new Date(Date.now() - draftLifetime * 1000)
}

export function editableDraft(id: string) {
  return and(
    eq(membershipApplications.id, id),
    eq(membershipApplications.paymentStatus, 'draft'),
    gte(membershipApplications.createdAt, draftCutoff()),
  )
}

export async function readCheckoutDraft() {
  const id = getCookie(draftCookie)
  if (!id || !applicationIdSchema.safeParse(id).success) return null
  const [row] = await db
    .select({
      id: membershipApplications.id,
      firstName: membershipApplications.firstName,
      lastName: membershipApplications.lastName,
      primaryEmail: membershipApplications.primaryEmail,
      uwEmail: membershipApplications.uwEmail,
      uwStatus: membershipApplications.uwStatus,
      plusOneResponse: membershipApplications.plusOneResponse,
      duration: membershipApplications.duration,
      paymentStatus: membershipApplications.paymentStatus,
      targetExpireQtr: membershipApplications.targetExpireQtr,
      targetLabel: quarters.school,
    })
    .from(membershipApplications)
    .leftJoin(quarters, eq(quarters.index, membershipApplications.targetExpireQtr))
    .where(
      and(eq(membershipApplications.id, id), gte(membershipApplications.createdAt, draftCutoff())),
    )
  if (!row || row.paymentStatus === 'discarded') return null
  return {
    ...row,
    targetLabel: row.targetLabel ?? `quarter ${row.targetExpireQtr}`,
    duration: parseDuration(row.duration),
    uwEmail: row.uwEmail ?? '',
    questionnaire: parseQuestionnaire(row),
  }
}

export async function pruneCheckoutDrafts(dryRun: boolean) {
  const expired = and(
    sql`${membershipApplications.paymentStatus} in ('draft', 'discarded')`,
    lt(membershipApplications.createdAt, draftCutoff()),
    isNull(membershipApplications.squareOrderId),
  )
  if (dryRun)
    return (await db.select({ count: count() }).from(membershipApplications).where(expired))[0]
      .count
  return (await db.delete(membershipApplications).where(expired)).rowCount ?? 0
}

const draftInput = z
  .object({
    ...applicantInputShape,
    duration: z.enum(['quarterly', 'annual']),
    editId: applicationIdSchema.nullable(),
  })
  .transform(parseApplicantInput)
  .superRefine(requireStudentUwEmail)

export async function updateCheckoutDraft(
  input: z.output<typeof draftInput>,
  paymentStatus: 'draft' | 'exemption_requested',
) {
  if (!input.editId || getCookie(draftCookie) !== input.editId)
    throw new Error('Checkout unavailable')
  const result = await db
    .update(membershipApplications)
    .set({
      paymentStatus,
      firstName: input.firstName,
      lastName: input.lastName,
      primaryEmail: input.primaryEmail,
      submittedPrimaryEmail: input.primaryEmail,
      uwEmail: input.uwEmail,
      submittedUwEmail: input.uwEmail,
      uwStatus: input.questionnaire.uwStatus,
      plusOneResponse: input.questionnaire.plusOneResponse,
      duration: input.duration,
      targetExpireQtr: computeRenewal(
        0,
        input.duration,
        (await readQuarterConfig()).renewalQuarter,
      ),
      tier: tierForUwStatus(input.questionnaire.uwStatus),
    })
    .where(editableDraft(input.editId))
  if (result.rowCount !== 1) throw new Error('Checkout unavailable')
}

export async function saveCheckoutDraft(payload: unknown) {
  const input = draftInput.parse(payload)
  if (input.editId) return updateCheckoutDraft(input, 'draft')
  const current = await readCheckoutDraft()
  if (current && ['draft', 'pending', 'reconciliation_required'].includes(current.paymentStatus))
    return
  const result = await createMembershipApplication(input, input.duration, 'draft')
  if (!result.success) throw new Error(result.message)
  setCookie(draftCookie, result.applicationId, { ...cookieOptions, maxAge: draftLifetime })
}

export async function discardDraft(id: string) {
  if (id !== getCookie(draftCookie)) return false
  try {
    const result = await db
      .update(membershipApplications)
      .set({ paymentStatus: 'discarded' })
      .where(editableDraft(id))
    if (result.rowCount !== 1) return false
    deleteCookie(draftCookie, cookieOptions)
    return true
  } catch (error) {
    console.error('Failed to discard checkout draft', error)
    throw new Error('Could not start over.')
  }
}
