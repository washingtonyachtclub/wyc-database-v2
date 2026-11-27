import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'
import { is } from 'drizzle-orm'
import { SQLiteTable, getTableConfig } from 'drizzle-orm/sqlite-core'
import * as schema from '../src/db/schema'

const db = new DatabaseSync(':memory:')
for (const migration of readdirSync('migrations/d1')
  .filter((file) => file.endsWith('.sql'))
  .sort()) {
  db.exec(readFileSync('migrations/d1/' + migration, 'utf8'))
}
for (const table of Object.values(schema)) {
  if (!is(table, SQLiteTable)) continue
  const { name, columns } = getTableConfig(table)
  const actual = db
    .prepare('SELECT name FROM pragma_table_info(?) ORDER BY name')
    .all(name)
    .map((row) => row.name)
  const expected = columns.map((column) => column.name).sort()
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error('Migration columns differ for ' + name)
}
db.close()
