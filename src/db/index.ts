import mysql from 'mysql2'
import { drizzle } from 'drizzle-orm/mysql2'

function createDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error('❌ DATABASE_URL is missing')
  }
  const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    timezone: 'Z',
  })
  pool.on('connection', (connection) => {
    connection.query("SET time_zone = '+00:00'", (error) => {
      if (!error) return
      console.error('Failed to configure database timezone:', error)
      connection.destroy()
    })
  })
  return drizzle({ client: pool })
}

const globalForDb = global as unknown as {
  db: ReturnType<typeof createDatabase> | undefined
}

export const db = (globalForDb.db ??= createDatabase())
export default db
