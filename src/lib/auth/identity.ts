import { and, count, eq, gte, or } from 'drizzle-orm'
import db from '@/db/index'
import { lessonQuarter, lessons, officers, posPrivMap, privs, wycDatabase } from '@/db/schema'
import type { Privilege } from '../permissions'

export type AuthUser = {
  wycNumber: number
  first: string | null
  last: string | null
  email: string | null
}

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
    .innerJoin(posPrivMap, eq(officers.position, posPrivMap.position))
    .innerJoin(privs, eq(posPrivMap.priv, privs.index))
    .where(and(eq(officers.member, wycNumber), eq(officers.active, 1)))

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
        gte(lessons.expire, quarterRow.quarter),
      ),
    )

  if (instructorRow.count > 0 && !userPrivileges.includes('rtgs')) {
    userPrivileges.push('rtgs')
  }

  return userPrivileges
}
