import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import type { PositionInsertData } from './schema'
import { toPosition } from './schema'
import { positions, posType } from '@/db/schema'
import db from '@/db/index'
import { requirePrivilege } from '@/lib/auth/auth-middleware'

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
    return raw.map(toPosition)
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
    try {
      await db.delete(positions).where(eq(positions.index, index))
      return { success: true }
    } catch (error) {
      console.error('Failed to delete position:', error)
      throw new Error('Failed to delete position. It may be referenced by officer records.')
    }
  })
