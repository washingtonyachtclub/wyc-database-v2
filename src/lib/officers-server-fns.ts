import { eq } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import db from 'src/db/index'
import { toOfficer } from 'src/db/mappers'
import type { OfficerInsert } from 'src/db/officer-schema'
import {
  baseMemberPositionsQuery,
  baseOfficersQuery,
  getOfficerPagePositions,
  officerPageQuery,
} from 'src/db/officer-queries'
import { officers } from 'src/db/schema'
import { requirePrivilege } from '../lib/auth-middleware'

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
    const id = await db.insert(officers).values(data).$returningId()
    return { success: true, id }
  })

export const getMemberPositions = createServerFn({ method: 'GET' })
  .inputValidator((input: { wycNumber: number }) => ({ wycNumber: Number(input.wycNumber) }))
  .handler(async ({ data: { wycNumber } }) => {
    await requirePrivilege('db')
    const raw = await baseMemberPositionsQuery(wycNumber)
    return raw.map(toOfficer)
  })
