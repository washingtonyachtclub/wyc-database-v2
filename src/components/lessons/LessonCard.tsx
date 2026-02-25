import { AlertTriangle } from 'lucide-react'
import type { LessonRow } from '../../lib/lessons-server-fns'
import { isLessonUpcoming } from '../../lib/date-utils'

export function LessonCard({
  lesson,
  onClick,
}: {
  lesson: LessonRow
  onClick?: () => void
}) {
  const upcoming = isLessonUpcoming(lesson.calendarDate)
  const showUpcomingNotDisplayedWarning = upcoming && !lesson.display
  const showDisplayedPastWarning = !upcoming && !!lesson.display

  return (
    <div
      className={`border rounded-lg p-4 hover:bg-accent transition-colors ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      {showUpcomingNotDisplayedWarning && (
        <div className="flex items-center gap-2 text-destructive text-sm mb-2 p-2 rounded bg-destructive/10 border border-destructive/30">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Upcoming but not displayed on the website</span>
        </div>
      )}
      {showDisplayedPastWarning && (
        <div className="flex items-center gap-2 text-destructive text-sm mb-2 p-2 rounded bg-destructive/10 border border-destructive/30">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Displayed on the website but this lesson is in the past</span>
        </div>
      )}
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold">
            {lesson.subtype || lesson.type || 'Untitled Lesson'}
          </h4>
          {lesson.comments && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {lesson.comments}
            </p>
          )}
        </div>
        {lesson.size != null && (
          <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
            Size: {lesson.size}
          </span>
        )}
      </div>
      <div className="mt-3 space-y-1 text-sm">
        {lesson.dates && (
          <div className="text-foreground font-medium">{lesson.dates}</div>
        )}
        {(lesson.day || lesson.time) && (
          <div className="text-muted-foreground">
            {lesson.day && <span>{lesson.day}</span>}
            {lesson.day && lesson.time && (
              <span className="mx-1 text-xs align-middle">•</span>
            )}
            {lesson.time && <span>{lesson.time}</span>}
          </div>
        )}
        {(lesson.instructor1Name || lesson.instructor2Name) && (
          <div className="text-foreground space-y-0.5">
            {lesson.instructor1Name && (
              <div>
                <span className="font-medium">Instructor 1: </span>
                <span>{lesson.instructor1Name}</span>
              </div>
            )}
            {lesson.instructor2Name && (
              <div>
                <span className="font-medium">Instructor 2: </span>
                <span>{lesson.instructor2Name}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
