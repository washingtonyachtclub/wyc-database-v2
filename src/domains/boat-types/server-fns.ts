import { createServerFn } from '@tanstack/react-start'
import { count, desc, eq } from 'drizzle-orm'
import type { BoatTypeInsertData } from '@/domains/boat-types/schema'
import { toBoatType } from '@/domains/boat-types/schema'
import { boatTypes, checkouts } from '@/db/schema'
import db from '@/db/index'
import { requirePrivilege } from '@/lib/auth/auth-middleware'

export const getAllBoatTypes = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePrivilege('db')
  try {
    const raw = await db.select().from(boatTypes).orderBy(desc(boatTypes.fleet), boatTypes.type)
    // checkouts.boat stores the boat_types index as a string
    const usage = await db
      .select({ boat: checkouts.boat, n: count() })
      .from(checkouts)
      .groupBy(checkouts.boat)
    const counts = new Map(usage.map((u) => [u.boat, u.n]))
    return raw.map((r) => toBoatType(r, counts.get(String(r.index)) ?? 0))
  } catch (error) {
    console.error('Failed to fetch boat types:', error)
    throw new Error('Failed to fetch boat types')
  }
})

export const getDistinctBoatFleetNames = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePrivilege('db')
  try {
    const rows = await db.selectDistinct({ fleet: boatTypes.fleet }).from(boatTypes)
    return rows.map((r) => r.fleet).filter(Boolean)
  } catch (error) {
    console.error('Failed to fetch distinct fleet names:', error)
    throw new Error('Failed to fetch distinct fleet names')
  }
})

export const deleteBoatType = createServerFn({ method: 'POST' })
  .inputValidator((input: { index: number }) => input)
  .handler(async ({ data: { index } }) => {
    await requirePrivilege('db')
    const [{ n }] = await db
      .select({ n: count() })
      .from(checkouts)
      .where(eq(checkouts.boat, String(index)))
    if (n > 0) throw new Error(`Cannot delete: ${n} checkout(s) still reference this boat type.`)
    try {
      await db.delete(boatTypes).where(eq(boatTypes.index, index))
      return { success: true }
    } catch (error) {
      console.error('Failed to delete boat type:', error)
      throw new Error('Failed to delete boat type')
    }
  })

export const createBoatType = createServerFn({ method: 'POST' })
  .inputValidator((input: BoatTypeInsertData) => input)
  .handler(async ({ data }) => {
    await requirePrivilege('db')
    try {
      await db.insert(boatTypes).values({ ...data, usefulLink: '', numberInFleet: 0 })
      return { success: true }
    } catch (error) {
      console.error('Failed to create boat type:', error)
      throw new Error('Failed to create boat type')
    }
  })
