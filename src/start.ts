import { createMiddleware, createStart } from '@tanstack/react-start'

const auditMiddleware = createMiddleware().server(async ({ next, pathname, serverFnMeta }) => {
  const { auditRequest } = await import('./lib/audit-request')
  return auditRequest(serverFnMeta?.name ?? pathname, () => Promise.resolve(next()))
})

export const startInstance = createStart(() => ({ requestMiddleware: [auditMiddleware] }))
