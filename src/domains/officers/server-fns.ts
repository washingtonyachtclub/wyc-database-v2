import { and, eq } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import db from '@/db/index'
import { DATABASE_ADMIN_WYC_NUMBER } from '@/db/constants'
import { toOfficer } from '@/domains/officers/schema'
import type { OfficerInsert } from '@/domains/officers/schema'
import {
  baseMemberPositionsQuery,
  baseOfficersQuery,
  getOfficerPagePositions,
  officerPageQuery,
} from '@/domains/officers/queries'
import { officers, wycDatabase } from '@/db/schema'
import { requirePrivilege, requireSelfOrPrivilege } from '@/lib/auth/auth-middleware'

export const getDatabaseAdmin = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const [row] = await db
      .select({ first: wycDatabase.first, last: wycDatabase.last, email: wycDatabase.email })
      .from(wycDatabase)
      .where(eq(wycDatabase.wycNumber, DATABASE_ADMIN_WYC_NUMBER))
      .limit(1)
    if (!row) return null
    return {
      name: `${row.first ?? ''} ${row.last ?? ''}`.trim() || 'Database Admin',
      email: row.email ?? '',
    }
  } catch (error) {
    console.error('Failed to fetch database admin:', error)
    return null
  }
})

export const getAllOfficers = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePrivilege('db')
  const raw = await baseOfficersQuery()
  return raw.map(toOfficer)
})

export const getOfficerPageOfficers = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePrivilege('db')
  const raw = await officerPageQuery()
  return raw.map(toOfficer)
})

export const setOfficerActive = createServerFn({ method: 'POST' })
  .inputValidator((input: { index: number; active: boolean }) => ({
    index: Number(input.index),
    active: input.active,
  }))
  .handler(async ({ data: { index, active } }) => {
    await requirePrivilege('db')
    await db
      .update(officers)
      .set({ active: active ? 1 : 0 })
      .where(eq(officers.index, index))
    return { success: true }
  })

export const getPositionsForOfficerPage = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePrivilege('db')
  return getOfficerPagePositions()
})

export const createOfficer = createServerFn({ method: 'POST' })
  .inputValidator((data: OfficerInsert) => data)
  .handler(async ({ data }) => {
    await requirePrivilege('db')
    const [existing] = await db
      .select({ index: officers.index })
      .from(officers)
      .where(and(eq(officers.member, data.member), eq(officers.position, data.position)))
    if (existing) {
      await db.update(officers).set({ active: 1 }).where(eq(officers.index, existing.index))
      return { success: true, id: existing.index, reactivated: true }
    }
    const id = await db.insert(officers).values(data).$returningId()
    return { success: true, id }
  })

export const getMemberPositions = createServerFn({ method: 'GET' })
  .inputValidator((input: { wycNumber: number }) => ({ wycNumber: Number(input.wycNumber) }))
  .handler(async ({ data: { wycNumber } }) => {
    await requireSelfOrPrivilege(wycNumber, 'db', 'rtgs')
    const raw = await baseMemberPositionsQuery(wycNumber)
    return raw.map(toOfficer)
  })
