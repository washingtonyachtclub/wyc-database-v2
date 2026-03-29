import { createServerFn } from '@tanstack/react-start'
import { desc } from 'drizzle-orm'
import type { BoatTypeInsertData } from 'src/db/boat-type-schema'
import { toBoatType } from 'src/db/mappers'
import { boatTypes } from 'src/db/schema'
import db from '../db/index'
import { requirePrivilege } from './auth-middleware'

export const getAllBoatTypes = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePrivilege('db')
  try {
    const raw = await db.select().from(boatTypes).orderBy(desc(boatTypes.fleet), boatTypes.type)
    return raw.map(toBoatType)
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
