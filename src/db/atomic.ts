import { env } from 'cloudflare:workers'
import { getTableName, type Table } from 'drizzle-orm'

type WriteStatement = { toSQL(): { sql: string; params: unknown[] } }

export class AtomicWrite {
  private readonly writes: WriteStatement[] = []

  add(statement: WriteStatement) {
    this.writes.push(statement)
  }

  async nextId(table: Table) {
    const row = await env.DB.prepare('SELECT seq FROM sqlite_sequence WHERE name = ?')
      .bind(getTableName(table))
      .first<{ seq: number }>()
    return (row?.seq ?? 0) + 1
  }

  async commit() {
    const statements = this.writes.map((statement) => {
      const { sql, params } = statement.toSQL()
      return env.DB.prepare(sql).bind(...params)
    })
    if (statements.length) await env.DB.batch(statements)
  }
}

export async function atomicWrite<T>(plan: (write: AtomicWrite) => Promise<T>): Promise<T> {
  const write = new AtomicWrite()
  const result = await plan(write)
  await write.commit()
  return result
}
