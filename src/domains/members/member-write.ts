import { wycDatabase } from '@/db/schema'
import { hashPasswordArgon2, hashPasswordLegacy } from '@/lib/auth/auth'
import { generatePassphrase } from '@/lib/generate-passphrase'
import { and, desc, gte, lte } from 'drizzle-orm'

type Transaction = Parameters<Parameters<typeof import('@/db').default.transaction>[0]>[0]

export async function createMemberCredentials() {
  const password = generatePassphrase()
  return {
    legacyHash: hashPasswordLegacy(password),
    password,
    passwordArgon2: await hashPasswordArgon2(password),
  }
}

export async function allocateWycNumber(tx: Transaction): Promise<number> {
  const [mostRecentMember] = await tx
    .select({ wycNumber: wycDatabase.wycNumber })
    .from(wycDatabase)
    .orderBy(desc(wycDatabase.joinDate), desc(wycDatabase.wycNumber))
    .limit(1)
    .for('update')

  const firstCandidate = (mostRecentMember?.wycNumber ?? 0) + 1
  let setSize = 100
  while (true) {
    const takenRows = await tx
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
