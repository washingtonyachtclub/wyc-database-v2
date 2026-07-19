import { formatSessions } from '@/domains/lessons/format-sessions'
import type { RichLesson } from '@/domains/lessons/schema'
import { AlertTriangle, MapPin } from 'lucide-react'
import { isLessonUpcoming } from '../../lib/date-utils'
import { RichText } from '../ui/RichText'

export function LessonCard({
  lesson,
  onClick,
  dimmed,
}: {
  lesson: RichLesson & { enrolledCount?: number }
  onClick?: () => void
  dimmed?: boolean
}) {
  const sessionLines = formatSessions(lesson.sessions)
  const upcoming = isLessonUpcoming(lesson.calendarDate)
  const showUpcomingNotDisplayedWarning = !dimmed && upcoming && !lesson.display
  // old db inserts with 0000-00-00 for calendarDate
  const showDisplayedPastWarning =
    !dimmed && !upcoming && lesson.display && !(lesson.calendarDate === '0000-00-00')

  return (
    <div
      className={`border rounded-lg p-4 hover:bg-accent transition-colors ${
        onClick ? 'cursor-pointer' : ''
      } ${dimmed ? 'opacity-50' : ''}`}
      onClick={onClick}
    >
      {showUpcomingNotDisplayedWarning && (
        <div className="flex items-center gap-2 text-destructive text-sm mb-2 p-2 rounded bg-destructive/10 border border-destructive/30">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>This lesson is upcoming but is not displayed on the website</span>
        </div>
      )}
      {showDisplayedPastWarning && (
        <div className="flex items-center gap-2 text-destructive text-sm mb-2 p-2 rounded bg-destructive/10 border border-destructive/30">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>This lesson has passed but is still displayed on the website</span>
        </div>
      )}
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold">{lesson.subtype || lesson.type || 'Untitled Lesson'}</h4>
          {lesson.comments && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              <RichText text={lesson.comments} />
            </p>
          )}
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap ml-4 text-right">
          {lesson.enrolledCount !== undefined && (
            <div>
              Signed up: {lesson.enrolledCount}
              {lesson.size > 0 ? ` / ${lesson.size}` : ''}
            </div>
          )}
          {lesson.enrolledCount === undefined && <div>Size: {lesson.size}</div>}
        </span>
      </div>
      <div className="mt-3 space-y-1 text-sm">
        {sessionLines.map((line) => (
          <div key={line} className="text-foreground font-medium">
            {line}
          </div>
        ))}
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
        {lesson.location && (
          <div className="flex items-center gap-1 text-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {lesson.locationUrl ? (
              <a
                href={lesson.locationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                onClick={(e) => e.stopPropagation()}
              >
                {lesson.location}
              </a>
            ) : (
              <span>{lesson.location}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
