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
  return <DinghyTest />
}
