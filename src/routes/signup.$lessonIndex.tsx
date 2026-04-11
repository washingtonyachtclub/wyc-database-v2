import { Button } from '@/components/ui/button'
import {
  getLessonForSignupQueryOptions,
  useEnrollInLessonMutation,
} from '@/domains/lessons/query-options'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/signup/$lessonIndex')({
  beforeLoad: ({ context, params }) => {
    if (!context.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: { redirect: `/signup/${params.lessonIndex}` },
      })
    }
  },
  loader: ({ context, params }) => {
    return context.queryClient.ensureQueryData(
      getLessonForSignupQueryOptions(Number(params.lessonIndex)),
    )
  },
  component: SignupPage,
})

function SignupPage() {
  const { lessonIndex } = Route.useParams()
  const { data: signupData } = useSuspenseQuery(getLessonForSignupQueryOptions(Number(lessonIndex)))
  const enrollMutation = useEnrollInLessonMutation()

  if (!signupData) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-lg border p-8 text-center space-y-4">
          <h2 className="text-2xl font-bold">Lesson not found</h2>
          <p className="text-sm text-muted-foreground">
            This lesson does not exist or is no longer available for signup.
          </p>
        </div>
      </div>
    )
  }

  const { lesson, enrolledCount, waitlistedCount, isAlreadySignedUp } = signupData
  const isFull = enrolledCount >= lesson.size

  const handleSignup = () => {
    enrollMutation.mutate({ data: { lessonIndex: lesson.index } })
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="rounded-lg border p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Lesson Signup</h2>
          <h3 className="mt-2 text-lg font-semibold">
            {lesson.type} — {lesson.subtype}
          </h3>
        </div>

        {/* Lesson info */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            {lesson.day} | {lesson.time} | {lesson.dates}
          </p>
          <p>
            <span className="font-medium text-foreground">Instructor: </span>
            {lesson.instructor1Name}
          </p>
          {lesson.instructor2Name && (
            <p>
              <span className="font-medium text-foreground">Instructor 2: </span>
              {lesson.instructor2Name}
            </p>
          )}
          {lesson.comments && (
            <div>
              <span className="font-medium text-foreground">Comments: </span>
              <span className="whitespace-pre-wrap">{lesson.comments}</span>
            </div>
          )}
        </div>

        {/* Enrollment counts */}
        <div className="flex gap-4">
          <div className="rounded-md border p-3 flex-1 text-center">
            <div className="text-lg font-bold">
              {enrolledCount} / {lesson.size}
            </div>
            <div className="text-sm text-muted-foreground">Enrolled</div>
          </div>
          <div className="rounded-md border p-3 flex-1 text-center">
            <div className="text-lg font-bold">{waitlistedCount}</div>
            <div className="text-sm text-muted-foreground">Waitlisted</div>
          </div>
        </div>

        {/* Waitlist warning */}
        {isFull && !isAlreadySignedUp && !enrollMutation.isSuccess && (
          <div className="rounded-md bg-amber-100 text-amber-800 p-3 text-sm">
            This class is full. You will be added to the waitlist.
          </div>
        )}

        {/* Already signed up */}
        {isAlreadySignedUp && !enrollMutation.isSuccess && (
          <div className="rounded-md bg-blue-500/10 p-4 border border-blue-500 space-y-2">
            <p className="text-sm text-blue-700">You are already signed up for this lesson.</p>
            <Link to="/my-lessons" className="text-sm underline text-blue-700">
              View my lessons
            </Link>
          </div>
        )}

        {/* Error display */}
        {enrollMutation.error && (
          <div className="rounded-md bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{enrollMutation.error.message}</p>
          </div>
        )}

        {/* Success display */}
        {enrollMutation.isSuccess && (
          <div className="rounded-md bg-green-500/10 p-4 border border-green-500 space-y-2">
            <p className="text-sm text-green-700 font-medium">
              {enrollMutation.data.status === 'enrolled'
                ? 'You have been enrolled in this lesson!'
                : 'You have been added to the waitlist.'}
            </p>
            <Link to="/my-lessons" className="text-sm underline text-green-700">
              View my lessons
            </Link>
          </div>
        )}

        {/* Signup button */}
        {!isAlreadySignedUp && !enrollMutation.isSuccess && (
          <Button onClick={handleSignup} disabled={enrollMutation.isPending} className="w-full">
            {enrollMutation.isPending ? 'Signing up...' : isFull ? 'Join Waitlist' : 'Sign Up'}
          </Button>
        )}

        {/* TODO: Self-unenroll button */}
      </div>
    </div>
  )
}
