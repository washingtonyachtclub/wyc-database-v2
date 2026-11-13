import { randomUUID } from 'node:crypto'
import type { Pool, PoolConnection, QueryOptions, ResultSetHeader } from 'mysql2/promise'
import { getAuditContext } from './audit-context'
import { describeAuditQuery } from './audit-query'
import type { AuditEntry } from './audit-store'

type QueryArguments = [string | QueryOptions, unknown[]?]
type WriteAudit = (entry: AuditEntry) => Promise<void>

export function auditDatabaseClient<T extends Pool | PoolConnection>(
  client: T,
  write: WriteAudit,
): T {
  let transactionId: string | null = null
  const methods = new Map<PropertyKey, unknown>()

  async function execute(method: 'query' | 'execute', args: QueryArguments) {
    const options = args[0]
    const sql = typeof options === 'string' ? options : options.sql
    const values = args[1] ?? (typeof options === 'string' ? [] : options.values)
    const context = getAuditContext()
    const occurredAt = new Date()
    let description: ReturnType<typeof describeAuditQuery> = null
    try {
      description = describeAuditQuery(sql, Array.isArray(values) ? values : [])
    } catch {
      console.error('Unable to describe database operation for audit')
      description = {
        operation: 'OTHER',
        tableName: null,
        details: { statement: '[unavailable]', parameters: [], parameterCount: 0, truncated: true },
      }
    }
    const operation = description?.operation
    const starting = operation === 'BEGIN' || operation === 'START'
    const finishing = operation === 'COMMIT' || (operation === 'ROLLBACK' && !/\bto\b/i.test(sql))
    const entryTransactionId = starting ? randomUUID() : transactionId

    async function record(outcome: 'succeeded' | 'failed', result?: unknown, error?: unknown) {
      if (!description) return
      const header = result as Partial<ResultSetHeader> | undefined
      const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined
      try {
        await write({
          ...context,
          ...description,
          occurredAt,
          transactionId: entryTransactionId,
          outcome,
          affectedRows: typeof header?.affectedRows === 'number' ? header.affectedRows : null,
          insertId: header?.insertId ? String(header.insertId) : null,
          errorCode:
            typeof code === 'string' && /^[A-Z0-9_]+$/.test(code) ? code.slice(0, 64) : undefined,
        })
      } catch {
        console.error('Unable to persist database audit entry')
      }
    }

    let result: Awaited<ReturnType<Pool['query']>>
    try {
      const run = client[method].bind(client) as (
        ...input: QueryArguments
      ) => ReturnType<Pool['query']>
      result = await run(...args)
    } catch (error) {
      await record('failed', undefined, error)
      throw error
    }
    if (starting) transactionId = entryTransactionId
    await record('succeeded', result[0])
    if (finishing) transactionId = null
    return result
  }

  return new Proxy(client, {
    get(target, property) {
      if (property === 'connection' || property === 'pool' || property === 'prepare') {
        throw new Error('Raw driver access and streaming bypass database auditing')
      }
      if (methods.has(property)) return methods.get(property)
      let method: unknown
      if (property === 'query' || property === 'execute') {
        method = (...args: QueryArguments) => execute(property, args)
      } else if (property === 'getConnection' && 'getConnection' in target) {
        method = async () => auditDatabaseClient(await target.getConnection(), write)
      } else if (
        property === 'beginTransaction' ||
        property === 'commit' ||
        property === 'rollback'
      ) {
        const command = property === 'beginTransaction' ? 'begin' : property
        method = async () => {
          await execute('query', [command])
        }
      } else {
        const value = Reflect.get(target, property, target)
        method = typeof value === 'function' ? value.bind(target) : value
      }
      if (typeof method === 'function') methods.set(property, method)
      return method
    },
  })
}
