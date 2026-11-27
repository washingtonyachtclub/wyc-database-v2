import { open, unlink } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import pg from 'pg'

const destination = process.argv[2]
if (!destination || !process.env.DATABASE_URL) {
  throw new Error('Set DATABASE_URL and pass a new file path for the private D1 snapshot')
}
const sqlite = new DatabaseSync(':memory:')
sqlite.exec(readFileSync(new URL('../migrations/d1/0001_club_schema.sql', import.meta.url), 'utf8'))
const quote = (name) => '"' + name.replaceAll('"', '""') + '"'
const literal = (value) => (value == null ? 'NULL' : "'" + value.replaceAll("'", "''") + "'")
const tables = sqlite
  .prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name != 'sqlite_sequence'")
  .all()
const pending = new Set(tables.map((t) => t.name))
const source = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  types: { getTypeParser: () => (value) => value },
})
await source.connect()
let file
try {
  file = await open(destination, 'wx', 0o600)
  await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
  while (pending.size) {
    const table = [...pending].find((t) =>
      sqlite
        .prepare('SELECT [table] FROM pragma_foreign_key_list(?)')
        .all(t)
        .every((fk) => fk.table === t || !pending.has(fk.table)),
    )
    if (!table) throw new Error('Foreign key cycle in the schema')
    const columns = sqlite
      .prepare('SELECT name FROM pragma_table_info(?)')
      .all(table)
      .map((c) => quote(c.name))
      .join(', ')
    const from = 'FROM ' + quote(table)
    const { rows } = await source.query({
      text: 'SELECT ' + columns + ' ' + from,
      rowMode: 'array',
    })
    let values = []
    let bytes = 0
    async function flush() {
      if (!values.length) return
      const statement =
        'INSERT INTO ' + quote(table) + ' (' + columns + ') VALUES ' + values.join(',') + ';'
      sqlite.exec(statement)
      await file.writeFile(statement + '\n')
      values = []
      bytes = 0
    }
    for (const row of rows) {
      const tuple = '(' + row.map(literal).join(',') + ')'
      const size = Buffer.byteLength(tuple) + 1
      if (bytes + size > 55000) await flush()
      values.push(tuple)
      bytes += size
    }
    await flush()
    pending.delete(table)
    console.log(table, rows.length)
  }
  if (sqlite.prepare('pragma foreign_key_check').all().length)
    throw new Error('Foreign key check failed')
  await source.query('COMMIT')
} catch (error) {
  if (file) await unlink(destination)
  throw error
} finally {
  await file?.close()
  sqlite.close()
  await source.end()
}
