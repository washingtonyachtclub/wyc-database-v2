import { argon2d, argon2i, argon2id } from '@noble/hashes/argon2.js'
import { Buffer } from 'node:buffer'
import { timingSafeEqual } from 'node:crypto'

function base64(bytes: Uint8Array) {
  return Buffer.from(bytes).toString('base64').replace(/=+$/, '')
}

export async function hashPasswordArgon2(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = argon2id(new TextEncoder().encode(password), salt, {
    m: 65536,
    t: 3,
    p: 4,
    dkLen: 32,
  })
  return `$argon2id$v=19$m=65536,t=3,p=4$${base64(salt)}$${base64(hash)}`
}

export async function verifyPasswordArgon2(password: string, storedHash: string) {
  const parts =
    /^\$(argon2id|argon2i|argon2d)\$v=(16|19)\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/.exec(
      storedHash,
    )
  if (!parts) return false
  const [, algorithm, version, memory, iterations, parallelism, salt, digest] = parts
  const derive = algorithm === 'argon2id' ? argon2id : algorithm === 'argon2i' ? argon2i : argon2d
  const expected = Buffer.from(digest, 'base64')
  const actual = derive(new TextEncoder().encode(password), Buffer.from(salt, 'base64'), {
    m: Number(memory),
    t: Number(iterations),
    p: Number(parallelism),
    version: Number(version),
    dkLen: expected.length,
  })
  return timingSafeEqual(actual, expected)
}
