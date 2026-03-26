import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/forbidden')({
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: ForbiddenPage,
})

function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <h1 className="text-2xl font-bold">Access Denied</h1>
      <p className="text-muted-foreground">
        You don't have permission to access that page.
      </p>
      <Button asChild variant="outline">
        <Link to="/">Go to Home</Link>
      </Button>
    </div>
  )
}
