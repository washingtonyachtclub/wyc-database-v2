import { createFileRoute, redirect } from '@tanstack/react-router'

// legacy system redirect
export const Route = createFileRoute('/db.cgi')({
  validateSearch: (s: Record<string, unknown>) => ({ pg: s.pg as string | undefined }),
  beforeLoad: ({ search }) => {
    if (search.pg === 'NeedPW') throw redirect({ to: '/forgot-password' })
  },
})
