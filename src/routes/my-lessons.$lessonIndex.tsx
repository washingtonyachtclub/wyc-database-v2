import type { LessonSignupStatus } from '@/components/lessons/MemberLessonDetails'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/my-lessons/$lessonIndex')({
  beforeLoad: ({ context, params, search }) => {
    if (!context.isAuthenticated) throw redirect({ to: '/login' })
    throw redirect({
      to: '/lessons/$lessonIndex',
      params,
      search,
      replace: true,
    })
  },
  validateSearch: (search: Record<string, unknown>) => ({
    signedUp:
      search.signedUp === 'enrolled' || search.signedUp === 'waitlisted'
        ? (search.signedUp as LessonSignupStatus)
        : undefined,
  }),
})
