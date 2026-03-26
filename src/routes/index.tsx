import { createFileRoute } from '@tanstack/react-router'
import { requirePrivilegeForRoute } from '../lib/route-guards'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/')
  },
  component: HomePage,
})

function HomePage() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-4">Welcome to the new and improved database!</h1>
    </div>
  )
}
