import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { Client } from 'pg'

type Column = { name: string; type: string }
type Row = Record<string, string | null>
type Table = { columns: Column[]; rows: Row[]; count?: number; nextIdentity: string | null }
const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"'
const url = new URL(process.env.DATABASE_URL ?? '')
if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Postgres URL required')
if (decodeURIComponent(url.pathname.slice(1)) !== process.env.CONFIRM_DATABASE) {
  throw new Error('CONFIRM_DATABASE must equal the destination database name')
}
const file = process.argv[2]
if (!file) throw new Error('Usage: npm run db:import:mysql -- /private/path/export.jsonl')
const records = readFileSync(file, 'utf8')
  .trim()
  .split('\n')
  .map((line) => JSON.parse(line))
const manifest = records.shift()
if (
  manifest?.kind !== 'manifest' ||
  manifest.version !== 2 ||
  typeof manifest.rehearsal !== 'boolean' ||
  records.pop()?.kind !== 'complete'
) {
  throw new Error('Incomplete or unsupported export')
}
if (
  manifest.rehearsal &&
  !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
  process.env.CONFIRM_REHEARSAL_TARGET !==
    `${decodeURIComponent(url.username)}@${url.host}${url.pathname}`
) {
  throw new Error(
    'Hosted rehearsal imports require CONFIRM_REHEARSAL_TARGET=user@host:port/database',
  )
}
const tables = new Map<string, Table>()
for (const record of records) {
  if (record.kind === 'table') {
    if (tables.has(record.name)) throw new Error('Duplicate table')
    if (
      record.nextIdentity !== null &&
      (typeof record.nextIdentity !== 'string' || !/^[1-9][0-9]*$/.test(record.nextIdentity))
    )
      throw new Error('Invalid source identity: ' + record.name)
    tables.set(record.name, {
      columns: record.columns,
      rows: [],
      nextIdentity: record.nextIdentity,
    })
  } else if (record.kind === 'row') {
    const table = tables.get(record.table)
    if (!table || table.count !== undefined) throw new Error('Unexpected row')
    table.rows.push(record.values)
  } else if (record.kind === 'end-table') {
    const table = tables.get(record.name)
    if (!table || table.count !== undefined) throw new Error('Unexpected table end')
    table.count = record.count
  } else throw new Error('Unexpected export record')
}
if (JSON.stringify([...tables.keys()].sort()) !== JSON.stringify([...manifest.tables].sort())) {
  throw new Error('Export table inventory mismatch')
}
const client = new Client({ connectionString: url.toString(), options: '-c timezone=UTC' })
const zeroDates: Record<string, number> = {}
const legacyText: Record<string, number> = {}
const reports: { table: string; rows: number; sha256: string }[] = []
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort()
        .map(([k, v]) => [k, canonical(v)]),
    )
  return value
}
function normalize(value: string | null, type: string): unknown {
  if (value === null) return null
  if (/^(smallint|integer|bigint|real|double precision|numeric)$/.test(type)) return Number(value)
  if (type === 'json' || type === 'jsonb') return canonical(JSON.parse(value))
  if (type.startsWith('timestamp'))
    return value
      .replace('T', ' ')
      .replace(/\.0+$/, '')
      .replace(/(\.\d*?)0+$/, '$1')
  return value
}
function digest(rows: Row[], columns: { column_name: string; data_type: string }[]) {
  const normalized = rows
    .map((row) =>
      JSON.stringify(columns.map((column) => normalize(row[column.column_name], column.data_type))),
    )
    .sort()
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex')
}
let currentTable = 'connection'
try {
  await client.connect()
  await client.query('BEGIN')
  const { rows: columns } = await client.query<{
    table_name: string
    column_name: string
    data_type: string
    is_identity: string
  }>(
    "SELECT table_name,column_name,data_type,is_identity FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position",
  )
  const names = [...new Set(columns.map((column) => column.table_name))].sort()
  if (JSON.stringify(names) !== JSON.stringify([...tables.keys()].sort()))
    throw new Error('Source and destination table sets differ')
  await client.query('LOCK TABLE ' + names.map(quote).join(',') + ' IN ACCESS EXCLUSIVE MODE')
  for (const name of names) {
    const result = await client.query(`SELECT 1 FROM ${quote(name)} LIMIT 1`)
    if (result.rowCount) throw new Error('Destination must be empty: ' + name)
  }
  const { rows: dependencies } = await client.query<{ child: string; parent: string }>(
    "SELECT c.relname AS child,p.relname AS parent FROM pg_constraint f JOIN pg_class c ON c.oid=f.conrelid JOIN pg_class p ON p.oid=f.confrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE f.contype='f' AND n.nspname='public'",
  )
  const pending = new Set(names)
  while (pending.size) {
    const name = [...pending].find(
      (candidate) =>
        !dependencies.some(
          (dep) => dep.child === candidate && dep.parent !== candidate && pending.has(dep.parent),
        ),
    )
    if (!name) throw new Error('Foreign key cycle requires explicit migration handling')
    currentTable = name
    const table = tables.get(name)!
    if (table.count !== table.rows.length) throw new Error('Incomplete table: ' + name)
    const targetColumns = columns.filter((column) => column.table_name === name)
    const sourceNames = table.columns.map((column) => column.name)
    const targetNames = targetColumns.map((column) => column.column_name)
    const missing = targetNames.filter((column) => !sourceNames.includes(column))
    const allowed =
      name === 'calendartable'
        ? ['reservationType', 'createdByWYCNumber', 'title']
        : name === 'calendarboats'
          ? ['active']
          : []
    if (
      sourceNames.some((column) => !targetNames.includes(column)) ||
      missing.some((column) => !manifest.rehearsal || !allowed.includes(column))
    ) {
      throw new Error('Column mismatch: ' + name)
    }
    const imported: Row[] = []
    for (const source of table.rows) {
      if (JSON.stringify(Object.keys(source).sort()) !== JSON.stringify([...sourceNames].sort()))
        throw new Error('Row column mismatch: ' + name)
      const row: Row = { ...source }
      for (const column of table.columns) {
        const value = row[column.name]
        if (value !== null && /blob|binary/.test(column.type)) {
          if (!/^(?:[0-9a-fA-F]{2})*$/.test(value))
            throw new Error('Invalid blob encoding: ' + name + '.' + column.name)
          const bytes = Buffer.from(value, 'hex')
          try {
            row[column.name] = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
          } catch {
            const key = name + '.' + column.name
            if (key !== 'lessons.comments') throw new Error('Unexpected non-UTF-8 blob: ' + key)
            // Legacy lesson descriptions include Windows-1252 punctuation from pasted documents.
            row[column.name] = new TextDecoder('windows-1252', { fatal: true }).decode(bytes)
            legacyText[key] = (legacyText[key] ?? 0) + 1
          }
        }
        if (
          value !== null &&
          ['date', 'datetime', 'timestamp'].includes(column.type) &&
          value.startsWith('0000-00-00')
        ) {
          const key = name + '.' + column.name
          if (
            !['lessons.CalendarDate', 'wyc_ratings.date', 'checkouts.ExpectedReturn'].includes(key)
          )
            throw new Error('Unexpected zero date: ' + key)
          row[column.name] = null
          zeroDates[key] = (zeroDates[key] ?? 0) + 1
        }
      }
      for (const column of missing) {
        row[column] =
          column === 'reservationType'
            ? 'personal'
            : column === 'active'
              ? ['4', '7'].includes(row.cBoatId ?? '')
                ? '0'
                : '1'
              : null
      }
      imported.push(row)
    }
    const batchSize = Math.min(500, Math.floor(60_000 / targetNames.length))
    for (let offset = 0; offset < imported.length; offset += batchSize) {
      const batch = imported.slice(offset, offset + batchSize)
      const values = batch.flatMap((row) => targetNames.map((column) => row[column]))
      const placeholders = batch.map(
        (_, rowIndex) =>
          '(' +
          targetNames
            .map((_, colIndex) => '$' + (rowIndex * targetNames.length + colIndex + 1))
            .join(',') +
          ')',
      )
      await client.query(
        `INSERT INTO ${quote(name)} (${targetNames.map(quote).join(',')}) VALUES ${placeholders.join(',')}`,
        values,
      )
    }
    const { rows: actual } = await client.query(
      `SELECT ${targetNames.map((column) => `${quote(column)}::text AS ${quote(column)}`).join(',')} FROM ${quote(name)}`,
    )
    const hash = digest(imported, targetColumns)
    if (actual.length !== imported.length || digest(actual, targetColumns) !== hash)
      throw new Error('Verification failed: ' + name)
    for (const column of targetColumns.filter((column) => column.is_identity === 'YES')) {
      // ALTER SEQUENCE is transactional, unlike setval, so failed imports also roll back identities.
      const {
        rows: [sequence],
      } = await client.query('SELECT pg_get_serial_sequence($1,$2) AS name', [
        quote(name),
        column.column_name,
      ])
      const {
        rows: [maximum],
      } = await client.query(
        `SELECT COALESCE(MAX(${quote(column.column_name)}),0)::text AS value FROM ${quote(name)}`,
      )
      const rowNext = BigInt(maximum.value) + 1n
      if (table.nextIdentity === null) throw new Error('Missing source identity: ' + name)
      const sourceNext = BigInt(table.nextIdentity)
      const next = sourceNext > rowNext ? sourceNext : rowNext
      await client.query(`ALTER SEQUENCE ${sequence.name} RESTART WITH ${next > 0n ? next : 1n}`)
    }
    reports.push({ table: name, rows: imported.length, sha256: hash })
    pending.delete(name)
  }
  await client.query('COMMIT')
  console.log(
    JSON.stringify(
      { rehearsal: manifest.rehearsal, tables: reports, zeroDates, legacyText },
      null,
      2,
    ),
  )
} catch (error) {
  await client.query('ROLLBACK').catch(() => {})
  // PostgreSQL errors can include private row values; only print our validation errors.
  console.error(
    error instanceof Error && !('code' in error)
      ? error.message
      : `Import failed at ${currentTable}; transaction rolled back (SQLSTATE ${error instanceof Error && 'code' in error ? error.code : 'unknown'}).`,
  )
  process.exitCode = 1
} finally {
  await client.end()
}
