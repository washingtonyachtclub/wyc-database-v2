import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, desc, eq, gte, lte } from 'drizzle-orm'
import { baseLessonsSignedUpQuery, baseLessonsTaughtQuery } from 'src/db/lesson-queries'
import { toRichLesson } from 'src/db/lesson-schema'
import {
  fromMemberInsert,
  toMember,
  toMemberRating,
  toMemberTableRow,
} from 'src/db/member-schema'
import type { MemberFilters } from 'src/db/member-filter-types'
import { baseMemberQuery, memberSortColumns, withMemberFilters } from 'src/db/member-queries'
import { CreateMember, MemberProfileUpdate } from 'src/db/member-schema'
import { withPagination, withSorting } from 'src/db/query-helpers'
import { baseMemberRatingsQuery, baseRatingsGivenQuery } from 'src/db/rating-queries'
import { memcat, processedFormEntries, quarters, wycDatabase } from 'src/db/schema'
import db from '../db/index'
import {
  requireAuth,
  requirePrivilege,
  requireSelfOrPrivilege,
  sessionHasPrivilege,
} from '../lib/auth-middleware'
import { hashPasswordArgon2, hashPasswordLegacy } from './auth'
import { sendEmail } from './email'
import { generatePassphrase } from './generate-passphrase'
import { newMemberEmail, returningMemberEmail } from './email-templates'

export const getMembersTable = createServerFn({ method: 'GET' })
  .inputValidator(
    (input: {
      pageIndex: number
      pageSize: number
      filters?: MemberFilters
      sorting?: { id: string; desc: boolean }
    }) => {
      return {
        pageIndex: input.pageIndex,
        pageSize: input.pageSize,
        filters: input.filters,
        sorting: input.sorting,
      }
    },
  )
  .handler(async ({ data }) => {
    await requirePrivilege('db')

    try {
      const { pageIndex, pageSize, filters, sorting } = data

      const query = baseMemberQuery().$dynamic()

      withMemberFilters(query, filters)
      withSorting(query, sorting, memberSortColumns, wycDatabase.joinDate)
      withPagination(query, pageIndex, pageSize)

      const rawMembers = await query
      const members = rawMembers.map(toMemberTableRow)

      const countQuery = db.select({ count: count() }).from(wycDatabase).$dynamic()

      withMemberFilters(countQuery, filters)

      const [totalCountResult] = await countQuery
      const totalCount = totalCountResult.count

      return {
        data: members,
        totalCount,
      }
    } catch (error) {
      console.error('Failed to fetch members:', error)
      throw new Error('Failed to fetch members')
    }
  })

export const getNextWycNumber = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePrivilege('db')
  const mostRecentWycNumberRow = await db
    .select({ wycNumber: wycDatabase.wycNumber })
    .from(wycDatabase)
    .orderBy(desc(wycDatabase.joinDate))
    .limit(1)

  if (mostRecentWycNumberRow.length === 0) {
    return 1
  }
  const mostRecentWycNumber = mostRecentWycNumberRow[0].wycNumber

  let setSize = 100
  while (true) {
    const takenWycNumbers = await db
      .select({ wycNumber: wycDatabase.wycNumber })
      .from(wycDatabase)
      .where(
        and(
          gte(wycDatabase.wycNumber, mostRecentWycNumber + 1),
          lte(wycDatabase.wycNumber, mostRecentWycNumber + setSize),
        ),
      )

    const takenWycNumbersSet = new Set(
      takenWycNumbers.map((row: { wycNumber: number }) => row.wycNumber),
    )
    // if there is a ID available
    if (takenWycNumbersSet.size < setSize) {
      let candidateWycNumber = mostRecentWycNumber + 1
      while (takenWycNumbersSet.has(candidateWycNumber)) {
        candidateWycNumber++
      }
      return candidateWycNumber
    }
    setSize *= 2
  }
})

export const getCategories = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAuth()
  const result = await db.select().from(memcat).orderBy(memcat.index)
  return result
})

export const getQuarters = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAuth()
  const result = await db.select().from(quarters).orderBy(desc(quarters.index))
  return result
})

export const createMember = createServerFn({ method: 'POST' })
  .inputValidator((data: { member: CreateMember; sendEmail: boolean }) => data)
  .handler(async ({ data: { member, sendEmail: shouldSendEmail } }) => {
    await requirePrivilege('db')
    try {
      const password = generatePassphrase()
      const wycNumber = await getNextWycNumber()
      const argon2Hash = await hashPasswordArgon2(password)
      const legacyHash = hashPasswordLegacy(password)
      await db.insert(wycDatabase).values({
        ...fromMemberInsert(member),
        wycNumber,
        password: legacyHash,
        passwordArgon2: argon2Hash,
      })

      let emailSent = false
      let emailSimulated = false
      if (shouldSendEmail) {
        try {
          const emailText = newMemberEmail(
            { first: member.first, last: member.last, wycNumber },
            password,
          )
          const result = await sendEmail({
            to: member.email,
            subject: 'Welcome to the Washington Yacht Club!',
            text: emailText,
            idempotencyKey: `new-member/${wycNumber}`,
          })
          emailSent = true
          emailSimulated = result.simulated
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError)
        }
      }

      return { success: true as const, wycNumber, emailSent, emailSimulated }
    } catch (error: any) {
      console.error('Failed to create member:', error)

      if (error?.code === 'ER_NO_DEFAULT_FOR_FIELD') {
        throw new Error('A required field is missing')
      } else if (error?.code === 'ER_DATA_TOO_LONG') {
        throw new Error('Data too long for one or more fields')
      } else if (error?.code === 'ER_BAD_NULL_ERROR') {
        throw new Error('A required field is missing')
      }

      throw new Error('Failed to create member')
    }
  })

export const updateMember = createServerFn({ method: 'POST' })
  .inputValidator((input: { wycNumber: number } & MemberProfileUpdate) => ({
    ...input,
    wycNumber: Number(input.wycNumber),
  }))
  .handler(async ({ data }) => {
    await requirePrivilege('db')
    const { wycNumber, ...rest } = data
    const row = fromMemberInsert(rest)
    await db.update(wycDatabase).set(row).where(eq(wycDatabase.wycNumber, wycNumber))
    return { success: true, wycNumber }
  })

export const renewMember = createServerFn({ method: 'POST' })
  .inputValidator((input: { wycNumber: number; expireQtrIndex: number; sendEmail: boolean; formEmail: string }) => ({
    wycNumber: Number(input.wycNumber),
    expireQtrIndex: Number(input.expireQtrIndex),
    sendEmail: input.sendEmail,
    formEmail: input.formEmail,
  }))
  .handler(async ({ data }) => {
    await requirePrivilege('db')
    try {
      await db
        .update(wycDatabase)
        .set({ expireQtrIndex: data.expireQtrIndex })
        .where(eq(wycDatabase.wycNumber, data.wycNumber))

      let emailSent = false
      let emailSimulated = false
      let emailAddress: string | null = null
      if (data.sendEmail) {
        try {
          const [member] = await db
            .select({
              first: wycDatabase.first,
              last: wycDatabase.last,
              email: wycDatabase.email,
            })
            .from(wycDatabase)
            .where(eq(wycDatabase.wycNumber, data.wycNumber))

          const [quarter] = await db
            .select({ school: quarters.school })
            .from(quarters)
            .where(eq(quarters.index, data.expireQtrIndex))

          if (member && member.email) {
            emailAddress = member.email
            const formEmailDiffers =
              data.formEmail.toLowerCase().trim() !== member.email.toLowerCase().trim()
            const emailMismatch = formEmailDiffers
              ? { formEmail: data.formEmail, onFileEmail: member.email }
              : undefined
            const emailText = returningMemberEmail(
              member.first ?? '',
              member.last ?? '',
              data.wycNumber,
              quarter?.school ?? `quarter ${data.expireQtrIndex}`,
              emailMismatch,
            )
            const to = formEmailDiffers ? [member.email, data.formEmail] : member.email
            const result = await sendEmail({
              to,
              subject: 'WYC Membership Renewed',
              text: emailText,
              idempotencyKey: `renewal/${data.wycNumber}/${data.expireQtrIndex}`,
            })
            emailSent = true
            emailSimulated = result.simulated
          }
        } catch (emailError) {
          console.error('Failed to send renewal email:', emailError)
        }
      }

      return { success: true as const, wycNumber: data.wycNumber, emailSent, emailSimulated, emailAddress }
    } catch (error: any) {
      console.error('Failed to renew member:', error)
      throw new Error('Failed to renew member')
    }
  })

export const getAllMembersLite = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePrivilege('db', 'rtgs')
  const result = await db
    .select({
      wycNumber: wycDatabase.wycNumber,
      first: wycDatabase.first,
      last: wycDatabase.last,
      email: wycDatabase.email,
      expireQtrIndex: wycDatabase.expireQtrIndex,
    })
    .from(wycDatabase)
    .orderBy(desc(wycDatabase.expireQtrIndex), asc(wycDatabase.first), asc(wycDatabase.last))
  return result
})

export const getMemberById = createServerFn({ method: 'GET' })
  .inputValidator((input: { wycNumber: number }) => ({ wycNumber: Number(input.wycNumber) }))
  .handler(async ({ data: { wycNumber } }) => {
    await requireSelfOrPrivilege(wycNumber, 'db')
    const [row] = await db.select().from(wycDatabase).where(eq(wycDatabase.wycNumber, wycNumber))
    if (!row) return null
    return toMember(row)
  })

export const updateMemberProfile = createServerFn({ method: 'POST' })
  .inputValidator((input: { wycNumber: number } & MemberProfileUpdate) => ({
    ...input,
    wycNumber: Number(input.wycNumber),
  }))
  .handler(async ({ data }) => {
    await requireSelfOrPrivilege(data.wycNumber, 'db')
    const hasDb = await sessionHasPrivilege('db')
    const updateData: Record<string, unknown> = {
      first: data.first,
      last: data.last,
      email: data.email,
      streetAddress: data.streetAddress,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      phone1: data.phone1,
      phone2: data.phone2,
      studentId: data.studentId,
    }
    // Admin-only fields — only applied if user has db privilege
    if (hasDb) {
      updateData.outToSea = data.outToSea ? 1 : 0
      updateData.categoryId = data.categoryId
      updateData.expireQtrIndex = data.expireQtrIndex
    }

    await db.update(wycDatabase).set(updateData).where(eq(wycDatabase.wycNumber, data.wycNumber))
    return { success: true, wycNumber: data.wycNumber }
  })

export const getMemberRatings = createServerFn({ method: 'GET' })
  .inputValidator((input: { wycNumber: number }) => ({ wycNumber: Number(input.wycNumber) }))
  .handler(async ({ data: { wycNumber } }) => {
    await requireSelfOrPrivilege(wycNumber, 'db')
    const raw = await baseMemberRatingsQuery(wycNumber)
    return raw.map(toMemberRating)
  })

export const getMemberRatingsGiven = createServerFn({ method: 'GET' })
  .inputValidator((input: { wycNumber: number; since?: string }) => ({
    wycNumber: Number(input.wycNumber),
    since: input.since,
  }))
  .handler(async ({ data: { wycNumber, since } }) => {
    await requireSelfOrPrivilege(wycNumber, 'db')
    const raw = await baseRatingsGivenQuery(wycNumber, since)
    return raw.map(toMemberRating)
  })

export const getMemberLessonsTaught = createServerFn({ method: 'GET' })
  .inputValidator((input: { wycNumber: number; since?: string }) => ({
    wycNumber: Number(input.wycNumber),
    since: input.since,
  }))
  .handler(async ({ data: { wycNumber, since } }) => {
    await requireSelfOrPrivilege(wycNumber, 'db')
    const raw = await baseLessonsTaughtQuery(wycNumber, since)
    return raw.map(toRichLesson)
  })

export const getMemberLessonsSignedUp = createServerFn({ method: 'GET' })
  .inputValidator((input: { wycNumber: number; since?: string }) => ({
    wycNumber: Number(input.wycNumber),
    since: input.since,
  }))
  .handler(async ({ data: { wycNumber, since } }) => {
    await requireSelfOrPrivilege(wycNumber, 'db')
    const raw = await baseLessonsSignedUpQuery(wycNumber, since)
    return raw.map(toRichLesson)
  })

export const getDatabaseName = createServerFn({ method: 'GET' }).handler(async () => {
  const url = process.env.DATABASE_URL ?? ''
  return url.split('/').pop() ?? 'unknown'
})

export const getProcessedEntryIds = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePrivilege('db', 'rtgs')
  const rows = await db
    .select({ entryId: processedFormEntries.entryId })
    .from(processedFormEntries)
  return rows.map((r) => r.entryId)
})

export const markEntryProcessed = createServerFn({ method: 'POST' })
  .inputValidator((input: { entryId: number; wycNumber: number | null }) => input)
  .handler(async ({ data: { entryId, wycNumber } }) => {
    await requirePrivilege('db')
    await db.insert(processedFormEntries).values({ entryId, wycNumber })
  })
