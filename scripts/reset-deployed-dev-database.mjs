import { createConnection, escapeId } from 'mysql2/promise'

if (process.env.VERCEL_ENV !== 'production' || process.env.VITE_APP_ENV !== 'dev') {
  throw new Error('Database reset is limited to deployed development builds')
}

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) throw new Error('DATABASE_URL is required')

const databaseName = new URL(databaseUrl).pathname.slice(1)

if (!databaseName) throw new Error('DATABASE_URL must include a database name')

const connection = await createConnection(databaseUrl)

try {
  const [objects] = await connection.query(
    'SELECT TABLE_NAME AS name, TABLE_TYPE AS type FROM information_schema.tables WHERE table_schema = DATABASE()',
  )
  const views = objects.filter(({ type }) => type === 'VIEW')
  const tables = objects.filter(({ type }) => type === 'BASE TABLE')

  if (views.length > 0) {
    await connection.query(
      `DROP VIEW IF EXISTS ${views.map(({ name }) => escapeId(name)).join(', ')}`,
    )
  }

  await connection.query('SET FOREIGN_KEY_CHECKS = 0')

  if (tables.length > 0) {
    await connection.query(
      `DROP TABLE IF EXISTS ${tables.map(({ name }) => escapeId(name)).join(', ')}`,
    )
  }

  console.log(`Reset development database ${databaseName}`)
} finally {
  await connection.query('SET FOREIGN_KEY_CHECKS = 1')
  await connection.end()
}
