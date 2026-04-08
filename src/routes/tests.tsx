import { requirePrivilegeForRoute } from '@/lib/route-guards'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/tests')({
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/tests')
  },
  component: TestsPage,
})

function TestsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Tests</h1>
      <p className="text-muted-foreground">
        This is a work in progress for a new written test implementation.
      </p>
    </div>
  )
}
