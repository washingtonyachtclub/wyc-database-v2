import { requirePrivilegeForRoute } from '@/lib/route-guards'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/approve-exemptions')({
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/membership-approvals')
    throw redirect({
      to: '/membership-approvals',
      search: { category: 'dues-exemptions' },
    })
  },
})
