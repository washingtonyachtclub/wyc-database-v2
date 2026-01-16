import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: { redirect: '/' },
      })
    }
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
