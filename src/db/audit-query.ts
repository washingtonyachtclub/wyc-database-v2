import { is } from 'drizzle-orm'
import { getTableConfig, MySqlTable } from 'drizzle-orm/mysql-core'
import * as schema from './schema'

const MAX_SQL_LENGTH = 24_000
const MAX_STATEMENT_LENGTH = 3_000
const MAX_PARAMETERS = 32
const MAX_VALUE_LENGTH = 160
const REDACTED = '[redacted]'
const sensitiveColumn =
  /password|secret|token|hash|signature|code|key|session|credential|responses|submitted_values|student_?id/i
const tables = new Map(
  Object.values(schema)
    .filter((value) => is(value, MySqlTable))
    .map((table) => {
      const config = getTableConfig(table)
      return [config.name.toLowerCase(), config] as const
    }),
)
const identifiers = new Set(
  [...tables.values()].flatMap((table) => [
    table.name.toLowerCase(),
    ...table.columns.map((column) => column.name.toLowerCase()),
  ]),
)
const keywords = new Set(
  'insert into values value update set delete from replace where and or not null default in is like between as on duplicate key ignore low_priority limit order by asc desc select join left right inner outer using case when then else end true false current_timestamp now utc_timestamp begin start transaction commit rollback to savepoint release truncate table alter create drop with'.split(
    ' ',
  ),
)
const tokenPattern =
  /\/\*[\s\S]*?(?:\*\/|$)|--\s[^\r\n]*|#[^\r\n]*|'(?:\\[\s\S]|''|[^'\\])*(?:'|$)|"(?:\\[\s\S]|""|[^"\\])*(?:"|$)|`(?:``|[^`])*(?:`|$)|0x[\da-f]+|\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b|\?|[a-z_$][\w$]*|[^\s]/gi

function identifier(token: string | undefined): string {
  return (token ?? '').replace(/^`|`$/g, '').replaceAll('``', '`').toLowerCase()
}

function parameterColumns(tokens: string[], operation: string): Map<number, string> {
  const columns = new Map<number, string>()
  if (operation === 'INSERT' || operation === 'REPLACE') {
    const valuesAt = tokens.findIndex((token) => /^values?$/i.test(token))
    const columnsAt = tokens.indexOf('(')
    const columnsEnd = tokens.indexOf(')', columnsAt)
    if (columnsAt !== -1 && columnsEnd < valuesAt) {
      const names = tokens.slice(columnsAt + 1, columnsEnd).filter((token) => token !== ',')
      let depth = 0
      let column = 0
      for (let i = valuesAt + 1; i < tokens.length; i++) {
        const token = tokens[i]
        if (depth === 0 && token !== '(' && token !== ',') break
        if (token === '(') {
          if (depth === 0) column = 0
          depth++
        } else if (token === ')') depth--
        else if (token === ',' && depth === 1) column++
        else if (
          token === '?' &&
          depth === 1 &&
          ['(', ','].includes(tokens[i - 1]) &&
          [')', ','].includes(tokens[i + 1])
        ) {
          columns.set(i, identifier(names[column]))
        }
      }
    }
  }
  const lists: (string | undefined)[] = []
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === '(') {
      lists.push(/^in$/i.test(tokens[i - 1] ?? '') ? identifier(tokens[i - 2]) : undefined)
    } else if (tokens[i] === ')') lists.pop()
    if (tokens[i] !== '?') continue
    if (tokens[i - 1] === '=') columns.set(i, identifier(tokens[i - 2]))
    const list = lists.at(-1)
    if (list && ['(', ','].includes(tokens[i - 1]) && [')', ','].includes(tokens[i + 1])) {
      columns.set(i, list)
    }
  }
  return columns
}

function safeValue(value: unknown): string | number | boolean | null {
  if (value === null || typeof value === 'boolean') return value
  if (typeof value === 'number') return Number.isFinite(value) ? value : REDACTED
  if (typeof value === 'string') {
    return value.length <= MAX_VALUE_LENGTH ? value : '[long value omitted]'
  }
  if (value instanceof Date) return value.toISOString()
  return REDACTED
}

export function describeAuditQuery(sql: string, values: unknown[]) {
  if (/^\s*(select|show|explain|describe|desc|set|use)\b/i.test(sql)) return null
  const tokens = (sql.slice(0, MAX_SQL_LENGTH).match(tokenPattern) ?? []).filter(
    (token) => !/^(\/\*|--\s|#)/.test(token),
  )
  const operation = (tokens[0] ?? 'UNKNOWN').toUpperCase()
  if (['SELECT', 'SHOW', 'EXPLAIN', 'DESCRIBE', 'DESC', 'SET', 'USE'].includes(operation)) {
    return null
  }
  const tableAt =
    operation === 'UPDATE' ? 1 : tokens.findIndex((token) => /^(into|from|table)$/i.test(token)) + 1
  const table = tableAt > 0 ? tables.get(identifier(tokens[tableAt])) : undefined
  if (table?.name === 'audit_log') return null
  const columns = parameterColumns(tokens, operation)
  const parameters: { column: string | null; value: ReturnType<typeof safeValue> }[] = []
  let parameterIndex = 0
  const statement = tokens
    .map((token, i) => {
      if (token === '?') {
        const name = columns.get(i)
        const column = table?.columns.find((candidate) => candidate.name.toLowerCase() === name)
        if (parameters.length < MAX_PARAMETERS) {
          parameters.push({
            column: column?.name ?? null,
            value:
              column && !sensitiveColumn.test(column.name) && column.dataType !== 'json'
                ? safeValue(values[parameterIndex])
                : REDACTED,
          })
        }
        parameterIndex++
        return '?'
      }
      if (/^['"\d]/.test(token)) return '?'
      const name = identifier(token)
      if (
        !identifiers.has(name) &&
        !keywords.has(name) &&
        !/^sp\d+$/.test(name) &&
        !/^[(),.?=<>!+\-*/%|&^~:;]$/.test(token)
      ) {
        return '[identifier]'
      }
      return token
    })
    .join(' ')
  return {
    operation: keywords.has(operation.toLowerCase()) ? operation : 'OTHER',
    tableName: table?.name ?? null,
    details: {
      statement: statement.slice(0, MAX_STATEMENT_LENGTH),
      parameters: sql.length <= MAX_SQL_LENGTH ? parameters : [],
      parameterCount: values.length,
      truncated:
        sql.length > MAX_SQL_LENGTH ||
        statement.length > MAX_STATEMENT_LENGTH ||
        values.length > MAX_PARAMETERS,
    },
  }
}
