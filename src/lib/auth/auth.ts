import argon2 from 'argon2'
import { createHash } from 'node:crypto'

// Legacy MySQL SHA1: CONCAT('*', UPPER(SHA1(UNHEX(SHA1(password)))))
// Kept for the parallel period where both old and new systems share the DB.

export function hashPasswordLegacy(password: string): string {
  const firstHash = createHash('sha1').update(password).digest('hex')
  const binary = Buffer.from(firstHash, 'hex')
  const secondHash = createHash('sha1').update(binary).digest('hex')
  return `*${secondHash.toUpperCase()}`
}

export function verifyPasswordLegacy(password: string, storedHash: string): boolean {
  const clean = (h: string) => (h.startsWith('*') ? h.slice(1) : h).toUpperCase()
  return clean(hashPasswordLegacy(password)) === clean(storedHash)
}

// Argon2id

export async function hashPasswordArgon2(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id })
}

export async function verifyPasswordArgon2(password: string, storedHash: string): Promise<boolean> {
  return argon2.verify(storedHash, password)
}

// Dual verification — checks both hashes (OR logic).
// During the parallel period, the old system can change the legacy `password`
// column at any time, making a previously written Argon2id hash stale.
// Checking both ensures login always works if either hash is correct.

export type VerifyResult = {
  valid: boolean
  needsUpgrade: boolean
}

export async function verifyPasswordDual(
  password: string,
  legacyHash: string | null,
  argon2Hash: string | null,
): Promise<VerifyResult> {
  const [argon2Valid, legacyValid] = await Promise.all([
    argon2Hash ? verifyPasswordArgon2(password, argon2Hash) : false,
    legacyHash ? verifyPasswordLegacy(password, legacyHash) : false,
  ])

  const valid = argon2Valid || legacyValid
  const needsUpgrade = valid && !argon2Valid

  return { valid, needsUpgrade }
}
