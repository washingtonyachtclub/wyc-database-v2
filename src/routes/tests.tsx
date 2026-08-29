import { requirePrivilegeForRoute } from '@/lib/route-guards'
import { createFileRoute } from '@tanstack/react-router'
import { DinghyTest } from '@/components/tests/DinghyTest'

export const Route = createFileRoute('/tests')({
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/tests')
  },
  component: TestsPage,
})

function TestsPage() {
  const { user } = Route.useRouteContext()
  if (!user) return null

  return <DinghyTest memberWycNumber={user.wycNumber} />
}
