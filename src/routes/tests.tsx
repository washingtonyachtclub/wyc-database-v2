import { requirePrivilegeForRoute } from '@/lib/route-guards'
import { createFileRoute } from '@tanstack/react-router'
import { WrittenTests } from '@/components/tests/WrittenTests'

export const Route = createFileRoute('/tests')({
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/tests')
  },
  component: TestsPage,
})

function TestsPage() {
  const { user } = Route.useRouteContext()
  if (!user) return null

  return <WrittenTests memberWycNumber={user.wycNumber} />
}
