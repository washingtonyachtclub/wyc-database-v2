import { lessonQuarterIndex } from '@/domains/lessons/quarter-query.d1'
import { and, count, eq, gte, or } from 'drizzle-orm'
import { db } from '@/db/d1'
import {
  lessonQuarter,
  lessons,
  officers,
  positions,
  posPrivMap,
  privs,
  wycDatabase,
} from '@/db/schema.d1'
import type { Privilege } from '../permissions'

import type { AuthUser } from './identity'

export async function loadAuthUser(wycNumber: number): Promise<AuthUser | null> {
  const [user] = await db
    .select({
      wycNumber: wycDatabase.wycNumber,
      first: wycDatabase.first,
      last: wycDatabase.last,
      email: wycDatabase.email,
    })
    .from(wycDatabase)
    .where(eq(wycDatabase.wycNumber, wycNumber))
    .limit(1)

  return user ?? null
}

export async function loadUserPrivileges(wycNumber: number): Promise<Privilege[]> {
  const privRows = await db
    .selectDistinct({ name: privs.name })
    .from(officers)
    .innerJoin(positions, eq(officers.position, positions.index))
    .innerJoin(posPrivMap, eq(officers.position, posPrivMap.position))
    .innerJoin(privs, eq(posPrivMap.priv, privs.index))
    .where(and(eq(officers.member, wycNumber), eq(officers.active, 1), eq(positions.active, 1)))

  const userPrivileges: Privilege[] = privRows
    .map((row) => row.name?.trim())
    .filter((name): name is Privilege => name === 'db' || name === 'rtgs')

  const [quarterRow] = await db
    .select({ quarter: lessonQuarter.quarter })
    .from(lessonQuarter)
    .where(eq(lessonQuarter.index, 1))
    .limit(1)

  if (!quarterRow) {
    return userPrivileges
  }

  const [instructorRow] = await db
    .select({ count: count() })
    .from(lessons)
    .where(
      and(
        or(eq(lessons.instructor1, wycNumber), eq(lessons.instructor2, wycNumber)),
        gte(lessonQuarterIndex, quarterRow.quarter),
      ),
    )

  if (instructorRow.count > 0 && !userPrivileges.includes('rtgs')) {
    userPrivileges.push('rtgs')
  }

  return userPrivileges
}

export async function loadPasswordUser(wycNumber: number) {
  const [user] = await db
    .select({
      wycNumber: wycDatabase.wycNumber,
      first: wycDatabase.first,
      last: wycDatabase.last,
      email: wycDatabase.email,
      passwordArgon2: wycDatabase.passwordArgon2,
    })
    .from(wycDatabase)
    .where(eq(wycDatabase.wycNumber, wycNumber))
    .limit(1)
  return user ?? null
}
