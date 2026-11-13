import mysql from 'mysql2'
import { drizzle } from 'drizzle-orm/mysql2'
import { auditDatabaseClient } from './audit-client'
import { createAuditStore } from './audit-store'

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
  const audit = createAuditStore(process.env.DATABASE_URL)
  return { db: drizzle({ client: auditDatabaseClient(pool.promise(), audit.write) }), audit }
}

const globalForDb = global as unknown as {
  auditedDatabase: ReturnType<typeof createDatabase> | undefined
}

const database = (globalForDb.auditedDatabase ??= createDatabase())
export const db = database.db
export const pruneAuditLog = database.audit.prune
export default db
