import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'

function createDatabase() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is missing')
  if (!/^postgres(?:ql)?:\/\//.test(connectionString)) {
    throw new Error('This application requires a PostgreSQL DATABASE_URL')
  }
  const pool = new Pool({
    connectionString,
    options: '-c timezone=UTC',
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  })
  return drizzle({ client: pool })
}

const globalForDb = global as unknown as {
  db: ReturnType<typeof createDatabase> | undefined
}

export const db = (globalForDb.db ??= createDatabase())
export default db
