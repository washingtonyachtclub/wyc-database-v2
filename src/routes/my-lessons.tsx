import { LessonCard } from '@/components/lessons/LessonCard'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  getMyLessonsTaughtQueryOptions,
  getMySignedUpLessonsQueryOptions,
  useUnenrollFromLessonMutation,
} from '@/domains/lessons/query-options'
import type { SignedUpLesson } from '@/domains/lessons/schema'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/my-lessons')({
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(getMySignedUpLessonsQueryOptions())
    return context.queryClient.ensureQueryData(getMyLessonsTaughtQueryOptions())
  },
  component: MyLessonsPage,
})

function MyLessonsPage() {
  const { data: lessonsTaught } = useSuspenseQuery(getMyLessonsTaughtQueryOptions())
  const { data: signedUpLessons = [] } = useQuery(getMySignedUpLessonsQueryOptions())
  const navigate = useNavigate()

  return (
    <div className="p-4 space-y-8">
      <h1 className="text-2xl font-bold">My Lessons</h1>

      <section>
        <h2 className="text-xl font-semibold mb-4">Signed Up</h2>
        {signedUpLessons.length === 0 ? (
          <p className="text-muted-foreground">
            You are not signed up for any current or upcoming lessons.
          </p>
        ) : (
          <div className="space-y-4">
            {signedUpLessons.map((lesson) => (
              <SignedUpLessonCard key={lesson.index} lesson={lesson} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Teaching</h2>
        {lessonsTaught.length === 0 ? (
          <p className="text-muted-foreground">You are not teaching any lessons this quarter.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lessonsTaught.map((lesson) => (
              <LessonCard
                key={lesson.index}
                lesson={lesson}
                dimmed={!lesson.display}
                onClick={() =>
                  navigate({
                    to: '/lessons/$lessonIndex',
                    params: { lessonIndex: String(lesson.index) },
                  })
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function SignedUpLessonCard({ lesson }: { lesson: SignedUpLesson }) {
  const isEnrolled = lesson.status === 'enrolled'
  const [showUnenroll, setShowUnenroll] = useState(false)
  const unenrollMutation = useUnenrollFromLessonMutation()

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="text-lg font-semibold">
          {lesson.type} — {lesson.subtype}
        </h3>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
            isEnrolled ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
          }`}
        >
          {isEnrolled ? 'Enrolled' : 'Waitlisted'}
        </span>
      </div>

      <div className="text-sm text-muted-foreground space-y-1">
        <p>
          {lesson.day} | {lesson.time} | {lesson.dates}
        </p>
        <p>Class size: {lesson.size}</p>
      </div>

      <div className="text-sm space-y-1">
        <p>
          <span className="font-medium">Instructor: </span>
          {lesson.instructor1Name}
          {lesson.instructor1Email && (
            <span className="text-muted-foreground"> — {lesson.instructor1Email}</span>
          )}
        </p>
        {lesson.instructor2Name && (
          <p>
            <span className="font-medium">Instructor 2: </span>
            {lesson.instructor2Name}
            {lesson.instructor2Email && (
              <span className="text-muted-foreground"> — {lesson.instructor2Email}</span>
            )}
          </p>
        )}
      </div>

      {lesson.comments && (
        <div className="text-sm">
          <p className="font-medium">Comments:</p>
          <p className="text-muted-foreground whitespace-pre-wrap">{lesson.comments}</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="destructive" size="sm" onClick={() => setShowUnenroll(true)}>
          Unenroll
        </Button>
      </div>

      <AlertDialog open={showUnenroll} onOpenChange={setShowUnenroll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unenroll from Lesson</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unenroll from <strong>{lesson.subtype}</strong>? This will
              remove you from the lesson. If anyone is on the waitlist, they will take your spot.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => unenrollMutation.mutate(lesson.index)}
            >
              Unenroll
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
