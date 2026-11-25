import argon2 from 'argon2'

export async function hashPasswordArgon2(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id })
}

export async function verifyPasswordArgon2(password: string, storedHash: string): Promise<boolean> {
  return argon2.verify(storedHash, password)
}
