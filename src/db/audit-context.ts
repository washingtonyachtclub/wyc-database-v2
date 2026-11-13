import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'

type AuditContext = {
  requestId: string
  actorWycNumber: number | null
  effectiveWycNumber: number | null
  source: 'request' | 'anonymous' | 'system' | 'unknown'
  action: string
}

const context = new AsyncLocalStorage<AuditContext>()

export function getAuditContext(): AuditContext {
  return (
    context.getStore() ?? {
      requestId: randomUUID(),
      actorWycNumber: null,
      effectiveWycNumber: null,
      source: 'unknown',
      action: 'unattributed',
    }
  )
}

export function withAuditContext<T>(values: Partial<AuditContext>, callback: () => T): T {
  return context.run({ ...getAuditContext(), ...values }, callback)
}
