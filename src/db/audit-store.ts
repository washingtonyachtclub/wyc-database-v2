import mysql from 'mysql2/promise'
import type { PoolConnection, ResultSetHeader } from 'mysql2/promise'
import type { getAuditContext } from './audit-context'
import type { describeAuditQuery } from './audit-query'

export const AUDIT_RETENTION_DAYS = 30
const AUDIT_TIMEOUT_MS = 500
const FAILURE_COOLDOWN_MS = 60_000

export type AuditEntry = ReturnType<typeof getAuditContext> &
  NonNullable<ReturnType<typeof describeAuditQuery>> & {
    occurredAt: Date
    transactionId: string | null
    outcome: 'succeeded' | 'failed'
    affectedRows: number | null
    insertId: string | null
    errorCode?: string
  }

export function createAuditStore(databaseUrl: string) {
  const pool = mysql.createPool({
    uri: databaseUrl,
    timezone: 'Z',
    connectionLimit: 2,
    waitForConnections: true,
    queueLimit: 32,
    connectTimeout: AUDIT_TIMEOUT_MS,
  })
  let unavailableUntil = 0

  function acquire(): Promise<PoolConnection> {
    return new Promise((resolve, reject) => {
      let expired = false
      const timeout = setTimeout(() => {
        expired = true
        reject(new Error('Audit connection acquisition timed out'))
      }, AUDIT_TIMEOUT_MS)
      pool.getConnection().then(
        (connection) => {
          clearTimeout(timeout)
          if (expired) connection.release()
          else resolve(connection)
        },
        (error) => {
          clearTimeout(timeout)
          reject(error)
        },
      )
    })
  }

  async function query(sql: string, values: unknown[]) {
    const deadline = Date.now() + AUDIT_TIMEOUT_MS
    const connection = await acquire()
    try {
      const result = await connection.query<ResultSetHeader>(
        { sql, timeout: Math.max(1, deadline - Date.now()) },
        values,
      )
      connection.release()
      return result[0]
    } catch (error) {
      connection.destroy()
      throw error
    }
  }

  function reportFailure(error: unknown) {
    if (Date.now() >= unavailableUntil) console.error('Audit database operation failed:', error)
    unavailableUntil = Date.now() + FAILURE_COOLDOWN_MS
  }

  async function write(entry: AuditEntry): Promise<void> {
    if (Date.now() < unavailableUntil) return
    try {
      let details = { ...entry.details, errorCode: entry.errorCode }
      if (Buffer.byteLength(JSON.stringify(details)) > 8_192) {
        details = {
          ...details,
          statement: details.statement.slice(0, 1_000),
          parameters: [],
          truncated: true,
        }
      }
      await query(
        `INSERT INTO audit_log
            (occurred_at, request_id, actor_wyc_number, effective_wyc_number, source, action,
             transaction_id, operation, table_name, outcome, affected_rows, insert_id, details)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entry.occurredAt,
          entry.requestId,
          entry.actorWycNumber,
          entry.effectiveWycNumber,
          entry.source,
          entry.action.slice(0, 160),
          entry.transactionId,
          entry.operation,
          entry.tableName,
          entry.outcome,
          entry.affectedRows,
          entry.insertId,
          JSON.stringify(details),
        ],
      )
    } catch (error) {
      reportFailure(error)
    }
  }

  async function prune(dryRun = false) {
    const cutoff = new Date(Date.now() - AUDIT_RETENTION_DAYS * 86_400_000)
    if (dryRun) return { deleted: 0, dryRun, cutoff: cutoff.toISOString() }
    let deleted = 0
    try {
      for (let batch = 0; batch < 10; batch++) {
        const result = await query(
          'DELETE FROM audit_log WHERE occurred_at < ? ORDER BY occurred_at LIMIT 1000',
          [cutoff],
        )
        deleted += result.affectedRows
        if (result.affectedRows < 1000) break
      }
      return { deleted, dryRun, cutoff: cutoff.toISOString() }
    } catch (error) {
      reportFailure(error)
      return { deleted, dryRun, cutoff: cutoff.toISOString(), failed: true }
    }
  }

  return { write, prune }
}
