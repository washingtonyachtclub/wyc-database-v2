import { drizzle } from 'drizzle-orm/mysql2'

// 1. Setup a global reference to persist across hot-reloads
const globalForDb = global as unknown as {
  db: ReturnType<typeof drizzle> | undefined
}

// 2. Initialize only if it doesn't exist
if (!globalForDb.db) {
  if (!process.env.DATABASE_URL) {
    throw new Error('❌ DATABASE_URL is missing')
  }
  globalForDb.db = drizzle(process.env.DATABASE_URL)
}

// 3. Export the persistent instance
export const db = globalForDb.db
export default db
