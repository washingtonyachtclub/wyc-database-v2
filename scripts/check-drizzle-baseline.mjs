import mysql from 'mysql2/promise'
import { readMigrationFiles } from 'drizzle-orm/migrator'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) throw new Error('DATABASE_URL is required')

const [baseline] = readMigrationFiles({ migrationsFolder: './drizzle' })

if (!baseline) throw new Error('The repository has no baseline migration')

const connection = await mysql.createConnection(databaseUrl)

try {
  const [tables] = await connection.query(
    "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '__drizzle_migrations'",
  )

  if (Number(tables[0].count) !== 1) {
    throw new Error('The database has not recorded the Drizzle baseline')
  }

  const [records] = await connection.query(
    'SELECT COUNT(*) AS count FROM __drizzle_migrations WHERE hash = ? AND created_at = ?',
    [baseline.hash, baseline.folderMillis],
  )

  if (Number(records[0].count) !== 1) {
    throw new Error('The database migration ledger does not contain the repository baseline')
  }
} finally {
  await connection.end()
}
