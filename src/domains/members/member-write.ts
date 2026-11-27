import db from '@/db'
import { wycDatabase } from '@/db/schema'
import { hashPasswordArgon2 } from '@/lib/auth/auth'
import { generatePassphrase } from '@/lib/generate-passphrase'
import { and, desc, gte, lte } from 'drizzle-orm'

export async function createMemberCredentials() {
  const password = generatePassphrase()
  return {
    password,
    passwordArgon2: await hashPasswordArgon2(password),
  }
}

export async function allocateWycNumber(): Promise<number> {
  const [mostRecentMember] = await db
    .select({ wycNumber: wycDatabase.wycNumber })
    .from(wycDatabase)
    .orderBy(desc(wycDatabase.joinDate), desc(wycDatabase.wycNumber))
    .limit(1)

  const firstCandidate = (mostRecentMember?.wycNumber ?? 0) + 1
  let setSize = 100
  while (true) {
    const takenRows = await db
      .select({ wycNumber: wycDatabase.wycNumber })
      .from(wycDatabase)
      .where(
        and(
          gte(wycDatabase.wycNumber, firstCandidate),
          lte(wycDatabase.wycNumber, firstCandidate + setSize - 1),
        ),
      )
    const taken = new Set(takenRows.map((row) => row.wycNumber))
    if (taken.size < setSize) {
      let candidate = firstCandidate
      while (taken.has(candidate)) candidate += 1
      return candidate
    }
    setSize *= 2
  }
}
