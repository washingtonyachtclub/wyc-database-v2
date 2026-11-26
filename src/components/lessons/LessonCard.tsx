import { LessonSchedule } from './LessonSchedule'
import type { RichLesson } from '@/domains/lessons/schema'
import { ChevronRight } from 'lucide-react'
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
  return (
    <div
      className={`border rounded-lg p-4 hover:bg-accent transition-colors ${
        onClick ? 'cursor-pointer' : ''
      } ${dimmed ? 'opacity-50' : ''}`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          onClick()
        }
      }}
      role={onClick ? 'link' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold">{lesson.subtype || lesson.type || 'Untitled Lesson'}</h4>
          {lesson.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              <RichText text={lesson.description} />
            </p>
          )}
        </div>
        <div className="flex items-start gap-2 text-muted-foreground whitespace-nowrap ml-4 text-right">
          <span className="text-xs">
            {lesson.enrolledCount !== undefined && (
              <div>
                Signed up: {lesson.enrolledCount}
                {lesson.size > 0 ? ` / ${lesson.size}` : ''}
              </div>
            )}
            {lesson.enrolledCount === undefined && (
              <div>Size: {lesson.size === 0 ? 'Unlimited' : lesson.size}</div>
            )}
          </span>
          {onClick && <ChevronRight className="h-5 w-5 shrink-0" />}
        </div>
      </div>
      <div className="mt-3 space-y-1 text-sm">
        <LessonSchedule sessions={lesson.sessions} dateClassName="text-foreground font-medium" />
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
