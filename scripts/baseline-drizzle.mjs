import mysql from 'mysql2/promise'
import { drizzle } from 'drizzle-orm/mysql2'
import { migrate } from 'drizzle-orm/mysql2/migrator'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) throw new Error('DATABASE_URL is required')

const databaseName = new URL(databaseUrl).pathname.slice(1)

if (process.env.CONFIRM_DATABASE !== databaseName) {
  throw new Error(`Set CONFIRM_DATABASE=${databaseName} to baseline this database`)
}

const pool = mysql.createPool(databaseUrl)

try {
  const db = drizzle({ client: pool })
  const result = await migrate(db, {
    migrationsFolder: './drizzle',
    init: true,
  })

  if (result?.exitCode === 'databaseMigrations') {
    throw new Error('The database already has migration records')
  }
  if (result?.exitCode === 'localMigrations') {
    throw new Error('Baselining requires exactly one local migration')
  }

  console.log(`Recorded the Drizzle baseline for ${databaseName}`)
} finally {
  await pool.end()
}
