import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated || !context.user) {
      throw redirect({ to: '/login' })
    }
    throw redirect({
      to: '/members/$wycNumber',
      params: { wycNumber: String(context.user.wycNumber) },
    })
  },
})
