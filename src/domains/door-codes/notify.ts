import db from '@/db/index'
import { doorCodes, ratings, wycDatabase } from '@/db/schema'
import type { BatchMessage } from '@/lib/email'
import { sendEmailBatch } from '@/lib/email'
import { doorUnlockedEmail, doorUnlockedSubject } from '@/lib/emails/door-codes'
import { eq, inArray } from 'drizzle-orm'
import { getActiveMemberRatings } from '@/domains/ratings/queries'
import type { DoorCodeSlug } from './rules'
import { unlockedSlugs } from './rules'

export type DoorUnlockResult = { emailSent: boolean; emailSimulated: boolean }

const NO_EMAIL: DoorUnlockResult = { emailSent: false, emailSimulated: false }

/**
 * Diffs the member's unlocked doors against `before` (snapshotted prior to the rating insert)
 * and emails them about each newly unlocked door.
 */
export async function notifyDoorUnlocks({
  wycNumber,
  ratingIndex,
  before,
}: {
  wycNumber: number
  ratingIndex: number
  before: DoorCodeSlug[]
}): Promise<DoorUnlockResult> {
  try {
    const after = unlockedSlugs(await getActiveMemberRatings(wycNumber))
    const newly = after.filter((slug) => !before.includes(slug))
    if (newly.length === 0) return NO_EMAIL

    const [[member], [ratingRow], doors] = await Promise.all([
      db
        .select({ first: wycDatabase.first, email: wycDatabase.email })
        .from(wycDatabase)
        .where(eq(wycDatabase.wycNumber, wycNumber))
        .limit(1),
      db
        .select({ text: ratings.text })
        .from(ratings)
        .where(eq(ratings.index, ratingIndex))
        .limit(1),
      db.select().from(doorCodes).where(inArray(doorCodes.slug, newly)),
    ])

    const to = member?.email?.trim() ?? ''
    if (!to) return NO_EMAIL

    const ratingName = ratingRow?.text?.trim() ?? ''
    const doorNames = new Map(doors.map((d) => [d.slug, d.name]))

    // A door with a rule but no door_codes row has no name or code to send.
    const messages: BatchMessage[] = newly
      .filter((slug) => doorNames.has(slug))
      .map((slug) => {
        const doorName = doorNames.get(slug) as string
        return {
          to,
          subject: doorUnlockedSubject(),
          text: doorUnlockedEmail({
            first: member.first?.trim() ?? '',
            ratingName,
            doorName,
            slug,
          }),
        }
      })

    if (messages.length === 0) return NO_EMAIL

    const { simulated } = await sendEmailBatch(
      messages,
      `door-unlock/${wycNumber}/${[...newly].sort().join(',')}`,
    )
    return { emailSent: true, emailSimulated: simulated }
  } catch (error) {
    console.error('Failed to send door unlock email:', error)
    return NO_EMAIL
  }
}
