import { createServerFn } from '@tanstack/react-start'
import { and, eq, inArray } from 'drizzle-orm'
import { OFFICER_POS_TYPE } from '@/db/constants'
import db from '@/db/index'
import { fullName } from '@/db/mapper-utils'
import { isMembershipActive } from '@/db/membership-utils'
import {
  doorCodes,
  lessonQuarter,
  officers,
  positions,
  ratings,
  wycDatabase,
  wycRatings,
} from '@/db/schema'
import { requireAuth } from '@/lib/auth/auth-middleware'
import { hasPrivilege } from '@/lib/permissions'
import { useAppSession } from '@/lib/auth/session'
import type { DoorCodeEntry, DoorCodeUpdateData } from './schema'
import { doorCodeUpdateSchema } from './schema'
import type { HeldRating } from './rules'
import { ruleForSlug, satisfiesRule } from './rules'

async function isOfficer(wycNumber: number): Promise<boolean> {
  const rows = await db
    .select({ index: officers.index })
    .from(officers)
    .innerJoin(positions, eq(officers.position, positions.index))
    .where(
      and(
        eq(officers.member, wycNumber),
        eq(officers.active, 1),
        eq(positions.active, 1),
        eq(positions.type, OFFICER_POS_TYPE),
      ),
    )
    .limit(1)
  return rows.length > 0
}

/** db privilege or an active officer position. */
async function canEditDoorCodes(wycNumber: number): Promise<boolean> {
  const session = await useAppSession()
  if (hasPrivilege(session.data.privileges ?? [], ['db'])) return true
  return isOfficer(wycNumber)
}

async function getCurrentQuarter(): Promise<number> {
  const [row] = await db
    .select({ quarter: lessonQuarter.quarter })
    .from(lessonQuarter)
    .where(eq(lessonQuarter.index, 1))
    .limit(1)
  return row.quarter
}

async function getHeldRatings(wycNumber: number): Promise<HeldRating[]> {
  const rows = await db
    .select({
      type: ratings.type,
      degree: ratings.degree,
      expires: ratings.expires,
      date: wycRatings.date,
    })
    .from(wycRatings)
    .innerJoin(ratings, eq(wycRatings.rating, ratings.index))
    .where(eq(wycRatings.member, wycNumber))

  return rows.map((r) => ({
    type: r.type,
    degree: r.degree,
    expires: r.expires !== 0,
    date: r.date ?? '',
  }))
}

/** Codes the caller has not earned are never serialized, so the client cannot leak them. */
export const getMyDoorCodes = createServerFn({ method: 'GET' }).handler(async () => {
  const wycNumber = await requireAuth()

  try {
    const [rows, canEdit] = await Promise.all([
      db.select().from(doorCodes),
      canEditDoorCodes(wycNumber),
    ])

    const unlockAll = canEdit
    let held: HeldRating[] = []
    let membershipActive = true

    if (!unlockAll) {
      const [[member], currentQuarter] = await Promise.all([
        db
          .select({ expireQtrIndex: wycDatabase.expireQtrIndex })
          .from(wycDatabase)
          .where(eq(wycDatabase.wycNumber, wycNumber))
          .limit(1),
        getCurrentQuarter(),
      ])
      membershipActive = member != null && isMembershipActive(member.expireQtrIndex, currentQuarter)
      held = membershipActive ? await getHeldRatings(wycNumber) : []
    }

    const editorIds = [...new Set(rows.map((r) => r.updatedBy).filter((id) => id !== null))]
    const editorNames = new Map<number, string>()
    if (editorIds.length > 0) {
      const editors = await db
        .select({
          wycNumber: wycDatabase.wycNumber,
          first: wycDatabase.first,
          last: wycDatabase.last,
        })
        .from(wycDatabase)
        .where(inArray(wycDatabase.wycNumber, editorIds))
      for (const e of editors) {
        editorNames.set(e.wycNumber, fullName(e.first, e.last))
      }
    }

    const entries: DoorCodeEntry[] = rows.map((row) => {
      const rule = ruleForSlug(row.slug)
      const unlocked = unlockAll || (rule != null && satisfiesRule(rule, held))

      if (!unlocked) {
        return {
          index: row.index,
          slug: row.slug,
          name: row.name,
          unlocked: false,
          // A slug with no rule is unreachable by ratings; say so rather than leak the code.
          requirement: rule?.label ?? 'Not available',
        }
      }

      return {
        index: row.index,
        slug: row.slug,
        name: row.name,
        unlocked: true,
        code: row.code,
        updatedAt: row.updatedAt ?? '',
        updatedByName: row.updatedBy != null ? (editorNames.get(row.updatedBy) ?? '') : '',
      }
    })

    // _index tiebreak is arbitrary but stable; MySQL guarantees no row order without ORDER BY.
    entries.sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1
      return a.index - b.index
    })

    return { entries, canEdit, membershipActive }
  } catch (error) {
    console.error('Failed to fetch door codes:', error)
    throw new Error('Failed to fetch door codes')
  }
})

export const updateDoorCode = createServerFn({ method: 'POST' })
  .inputValidator((input: DoorCodeUpdateData) => doorCodeUpdateSchema.parse(input))
  .handler(async ({ data }) => {
    const wycNumber = await requireAuth()
    if (!(await canEditDoorCodes(wycNumber))) {
      throw new Error('Forbidden: Insufficient privileges')
    }

    try {
      await db
        .update(doorCodes)
        .set({
          code: data.code,
          updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          updatedBy: wycNumber,
        })
        .where(eq(doorCodes.index, data.index))
      return { success: true }
    } catch (error) {
      console.error('Failed to update door code:', error)
      throw new Error('Failed to update door code')
    }
  })
