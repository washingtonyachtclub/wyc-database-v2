import { createFileRoute } from '@tanstack/react-router'
import { sessionHasPrivilege } from '@/lib/auth/auth-middleware'

export const Route = createFileRoute('/api/runtime')({
  server: {
    handlers: {
      GET: async () => {
        const headers = { 'Cache-Control': 'private, no-store' }

        try {
          if (!(await sessionHasPrivilege('db'))) {
            return new Response('Forbidden', { status: 403, headers })
          }

          return Response.json({ node: process.version }, { headers })
        } catch (error) {
          console.error('Failed to read runtime version:', error)
          return new Response('Failed to read runtime version', { status: 500, headers })
        }
      },
    },
  },
})
