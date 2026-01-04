import { createHash } from 'node:crypto'

/**
 * Hash a password using MySQL SHA1 format: SHA1(UNHEX(SHA1(password)))
 * This matches the old system's password hashing
 * @param password - Plain text password
 * @returns Hashed password with * prefix (MySQL format)
 */
export function hashPassword(password: string): string {
  // First SHA1 hash
  const firstHash = createHash('sha1').update(password).digest('hex')
  // UNHEX (convert hex string to binary) then SHA1 again
  // In Node.js, we convert hex to buffer, then hash again
  const binary = Buffer.from(firstHash, 'hex')
  const secondHash = createHash('sha1').update(binary).digest('hex')
  // MySQL format: * prefix + uppercase hex
  return `*${secondHash.toUpperCase()}`
}

/**
 * Verify a password against a stored hash
 * Uses MySQL SHA1 format for compatibility
 * @param password - Plain text password to verify
 * @param storedHash - Stored password hash from database
 * @returns True if password matches, false otherwise
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  // Remove * prefix if present
  const hashWithoutPrefix = storedHash.startsWith('*')
    ? storedHash.slice(1)
    : storedHash

  // Hash the provided password
  const hashedPassword = hashPassword(password)
  const hashedPasswordWithoutPrefix = hashedPassword.startsWith('*')
    ? hashedPassword.slice(1)
    : hashedPassword

  // Compare (case-insensitive for MySQL compatibility)
  return (
    hashedPasswordWithoutPrefix.toUpperCase() ===
    hashWithoutPrefix.toUpperCase()
  )
}
