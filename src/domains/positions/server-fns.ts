import { createServerFn } from '@tanstack/react-start'
import { count, eq } from 'drizzle-orm'
import type { PositionInsertData } from './schema'
import { toPosition } from './schema'
import { officers, positions, posPrivMap, posType } from '@/db/schema'
import db from '@/db/index'
import { requirePrivilege } from '@/lib/auth/auth-middleware'

async function getPositionUsageCounts() {
  const officerUsage = await db
    .select({ position: officers.position, n: count() })
    .from(officers)
    .groupBy(officers.position)
  const privUsage = await db
    .select({ position: posPrivMap.position, n: count() })
    .from(posPrivMap)
    .groupBy(posPrivMap.position)
  const counts = new Map<number, number>()
  for (const u of [...officerUsage, ...privUsage]) {
    if (u.position != null) counts.set(u.position, (counts.get(u.position) ?? 0) + u.n)
  }
  return counts
}

export const getAllPositions = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePrivilege('db')
  try {
    const raw = await db
      .select({
        index: positions.index,
        name: positions.name,
        type: positions.type,
        typeName: posType.text,
        active: positions.active,
      })
      .from(positions)
      .leftJoin(posType, eq(positions.type, posType.index))
      .orderBy(positions.type, positions.sortorder)
    const counts = await getPositionUsageCounts()
    return raw.map((r) => toPosition(r, counts.get(r.index) ?? 0))
  } catch (error) {
    console.error('Failed to fetch positions:', error)
    throw new Error('Failed to fetch positions')
  }
})

export const getAllPosTypes = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePrivilege('db')
  try {
    const raw = await db
      .select({ index: posType.index, text: posType.text })
      .from(posType)
      .orderBy(posType.index)
    return raw.map((r) => ({ index: r.index, text: r.text ?? '' }))
  } catch (error) {
    console.error('Failed to fetch position types:', error)
    throw new Error('Failed to fetch position types')
  }
})

export const createPosition = createServerFn({ method: 'POST' })
  .inputValidator((input: PositionInsertData) => input)
  .handler(async ({ data }) => {
    await requirePrivilege('db')
    try {
      await db.insert(positions).values({
        name: data.name,
        type: data.type,
        active: 1,
        sortorder: 0,
      })
      return { success: true }
    } catch (error) {
      console.error('Failed to create position:', error)
      throw new Error('Failed to create position')
    }
  })

export const setPositionActive = createServerFn({ method: 'POST' })
  .inputValidator((input: { index: number; active: boolean }) => input)
  .handler(async ({ data: { index, active } }) => {
    await requirePrivilege('db')
    try {
      await db
        .update(positions)
        .set({ active: active ? 1 : 0 })
        .where(eq(positions.index, index))
      return { success: true }
    } catch (error) {
      console.error('Failed to update position active status:', error)
      throw new Error('Failed to update position')
    }
  })

export const deletePosition = createServerFn({ method: 'POST' })
  .inputValidator((input: { index: number }) => input)
  .handler(async ({ data: { index } }) => {
    await requirePrivilege('db')
    const [{ n: officerN }] = await db
      .select({ n: count() })
      .from(officers)
      .where(eq(officers.position, index))
    const [{ n: privN }] = await db
      .select({ n: count() })
      .from(posPrivMap)
      .where(eq(posPrivMap.position, index))
    const total = officerN + privN
    if (total > 0) {
      throw new Error(`Cannot delete: still referenced by ${total} officer/privilege record(s).`)
    }
    try {
      await db.delete(positions).where(eq(positions.index, index))
      return { success: true }
    } catch (error) {
      console.error('Failed to delete position:', error)
      throw new Error('Failed to delete position')
    }
  })
