import { randomUUID } from 'node:crypto'
import { withAuditContext } from '@/db/audit-context'
import { useAppSession } from '@/lib/auth/session'

export async function auditRequest<T>(action: string, next: () => Promise<T>): Promise<T> {
  let actorWycNumber: number | null = null
  let effectiveWycNumber: number | null = null
  let source: 'request' | 'anonymous' | 'unknown' = 'anonymous'
  try {
    const { data } = await useAppSession()
    actorWycNumber = data.realIdentity?.userId ?? data.userId ?? null
    effectiveWycNumber = data.userId ?? null
    if (actorWycNumber !== null) source = 'request'
  } catch {
    source = 'unknown'
    console.error('Unable to read audit actor from session')
  }
  return withAuditContext(
    { requestId: randomUUID(), actorWycNumber, effectiveWycNumber, source, action },
    next,
  )
}
