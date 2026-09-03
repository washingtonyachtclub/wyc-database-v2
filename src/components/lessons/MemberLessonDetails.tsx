import { AnnouncementFeed } from '@/components/lesson-announcements/AnnouncementFeed'
import { RichText } from '@/components/ui/RichText'
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
import { getMemberLessonPageQueryOptions } from '@/domains/lesson-announcements/query-options'
import { formatSessions } from '@/domains/lessons/format-sessions'
import { useUnenrollFromLessonMutation } from '@/domains/lessons/query-options'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, MapPin } from 'lucide-react'
import { useState } from 'react'

export type LessonSignupStatus = 'enrolled' | 'waitlisted'

export function MemberLessonDetails({
  lessonId,
  signedUp,
}: {
  lessonId: number
  signedUp?: LessonSignupStatus
}) {
  const { data } = useSuspenseQuery(getMemberLessonPageQueryOptions(lessonId))
  const [showUnenroll, setShowUnenroll] = useState(false)
  const unenrollMutation = useUnenrollFromLessonMutation()
  const navigate = useNavigate()

  if (!data) {
    return (
      <div className="p-4 space-y-4">
        <p className="text-muted-foreground">
          This lesson is not available or you are no longer signed up for it.
        </p>
        <Button asChild variant="outline">
          <Link to="/my-lessons">Back to My Lessons</Link>
        </Button>
      </div>
    )
  }

  const { lesson, status, announcements } = data
  const sessionLines = formatSessions(lesson.sessions)

  return (
    <div className="mx-auto max-w-3xl p-4 space-y-8">
      <Button asChild variant="ghost" className="-ml-3">
        <Link to="/my-lessons">
          <ArrowLeft />
          My Lessons
        </Link>
      </Button>

      {signedUp && (
        <div className="rounded-md border border-border bg-muted p-4 text-sm space-y-1">
          <p className="font-medium">
            {signedUp === 'enrolled'
              ? 'You are enrolled in this lesson.'
              : 'You have been added to the waitlist.'}
          </p>
          <p>
            If you cannot attend, unenroll as soon as possible so someone else can take the spot.
          </p>
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{lesson.type}</p>
            <h1 className="text-2xl font-bold">{lesson.subtype}</h1>
          </div>
          {status && (
            <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium capitalize">
              {status}
            </span>
          )}
        </div>

        <div className="rounded-lg border border-border p-4 text-sm space-y-2">
          {sessionLines.map((line) => (
            <p key={line} className="font-medium">
              {line}
            </p>
          ))}
          <p>
            Instructor: {lesson.instructor1Name}
            {lesson.instructor2Name ? `, ${lesson.instructor2Name}` : ''}
          </p>
          {lesson.location && (
            <p className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {lesson.locationUrl ? (
                <a
                  href={lesson.locationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {lesson.location}
                </a>
              ) : (
                lesson.location
              )}
            </p>
          )}
          {lesson.description && (
            <div>
              <p className="font-medium">Description</p>
              <RichText text={lesson.description} />
            </div>
          )}
          {lesson.requirements && (
            <p>
              <span className="font-medium">Requirements: </span>
              {lesson.requirements}
            </p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Announcements</h2>
        <AnnouncementFeed lessonId={lesson.index} announcements={announcements} />
      </section>

      {status && (
        <div className="border-t border-border pt-6">
          <Button variant="destructive" onClick={() => setShowUnenroll(true)}>
            Unenroll
          </Button>
        </div>
      )}

      <AlertDialog open={showUnenroll} onOpenChange={setShowUnenroll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unenroll from lesson?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes you from {lesson.subtype}. If someone is waitlisted, they may take your
              spot.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                unenrollMutation.mutate(lesson.index, {
                  onSuccess: () => navigate({ to: '/my-lessons' }),
                })
              }
            >
              Unenroll
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
