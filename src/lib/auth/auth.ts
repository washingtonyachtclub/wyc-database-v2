export async function hashPasswordArgon2(password: string): Promise<string> {
  const argon2 = await import('argon2')
  return argon2.hash(password, { type: argon2.argon2id })
}

export async function verifyPasswordArgon2(password: string, storedHash: string): Promise<boolean> {
  const argon2 = await import('argon2')
  return argon2.verify(storedHash, password)
}
