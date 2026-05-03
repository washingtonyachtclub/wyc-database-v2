import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSetLessonDisplayMutation } from '@/domains/lessons/query-options'
import type { RichLessonWithEnrollment } from '@/domains/lessons/schema'
import { AlertTriangle } from 'lucide-react'
import { LESSON_CATEGORIES } from '../../db/constants'
import { isLessonUpcoming } from '../../lib/date-utils'
import { cn } from '../../lib/utils'

function lessonName(lesson: RichLessonWithEnrollment) {
  return lesson.subtype || lesson.type || 'Untitled Lesson'
}

function lessonWarning(
  lesson: RichLessonWithEnrollment,
): { message: string; color: 'yellow' | 'red' } | null {
  const upcoming = isLessonUpcoming(lesson.calendarDate)
  if (upcoming && !lesson.display)
    return { message: 'Upcoming but not displayed on website', color: 'yellow' }
  if (!upcoming && lesson.display && lesson.calendarDate !== '0000-00-00') {
    return { message: 'Past but still displayed on website', color: 'red' }
  }
  return null
}

function enrollmentLabel(lesson: RichLessonWithEnrollment) {
  const { enrolledCount, size } = lesson
  if (size > 0) return `${enrolledCount} / ${size}`
  return String(enrolledCount)
}

function isFull(lesson: RichLessonWithEnrollment) {
  return lesson.size > 0 && lesson.enrolledCount >= lesson.size
}

const ROW_GRID =
  'grid grid-cols-[auto_minmax(0,3fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_minmax(0,2fr)_minmax(0,1fr)] gap-3'

function LessonRow({ lesson, onClick }: { lesson: RichLessonWithEnrollment; onClick: () => void }) {
  const warning = lessonWarning(lesson)
  const full = isFull(lesson)
  const setDisplayMutation = useSetLessonDisplayMutation()

  return (
    <div
      onClick={onClick}
      className={cn(
        ROW_GRID,
        'items-center px-3 py-2 border-b border-border text-sm hover:bg-accent cursor-pointer',
        !lesson.display && 'opacity-50',
      )}
    >
      <div className="w-4">
        {warning && (
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertTriangle
                className={cn(
                  'h-4 w-4',
                  warning.color === 'yellow' ? 'text-yellow-500' : 'text-destructive',
                )}
                aria-label={warning.message}
              />
            </TooltipTrigger>
            <TooltipContent>{warning.message}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="truncate font-medium">
        {lessonName(lesson)}
        {lesson.comments && (
          <span className="ml-2 text-xs text-muted-foreground truncate">· {lesson.comments}</span>
        )}
      </div>
      <div className="truncate text-foreground">{lesson.dates}</div>
      <div className="truncate text-muted-foreground">
        {[lesson.day, lesson.time].filter(Boolean).join(' · ')}
      </div>
      <div className="truncate text-muted-foreground">
        {[lesson.instructor1Name, lesson.instructor2Name].filter(Boolean).join(', ')}
      </div>
      <div className="text-right whitespace-nowrap tabular-nums">
        {warning?.color === 'red' ? (
          <Button
            variant="destructive"
            size="sm"
            disabled={setDisplayMutation.isPending}
            onClick={(e) => {
              e.stopPropagation()
              setDisplayMutation.mutate({ data: { index: lesson.index, display: false } })
            }}
          >
            Un-display
          </Button>
        ) : (
          <span className={cn(full ? 'text-destructive font-medium' : 'text-muted-foreground')}>
            {enrollmentLabel(lesson)}
          </span>
        )}
      </div>
    </div>
  )
}

function RowHeader() {
  return (
    <div
      className={cn(
        ROW_GRID,
        'px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border bg-muted/30',
      )}
    >
      <div className="w-4" />
      <div>Lesson</div>
      <div>Dates</div>
      <div>Time</div>
      <div>Instructor</div>
      <div className="text-right">Signed up</div>
    </div>
  )
}

/** Grouped by category (mirrors the public lesson list). */
export function LessonsByCategory({
  lessons,
  onLessonClick,
}: {
  lessons: RichLessonWithEnrollment[]
  onLessonClick: (index: number) => void
}) {
  if (lessons.length === 0) return null

  const byCategoryId = new Map<number, RichLessonWithEnrollment[]>()
  for (const lesson of lessons) {
    const arr = byCategoryId.get(lesson.classTypeId) ?? []
    arr.push(lesson)
    byCategoryId.set(lesson.classTypeId, arr)
  }

  const sections: Array<{ label: string; lessons: RichLessonWithEnrollment[] }> =
    LESSON_CATEGORIES.map((cat) => ({
      label: cat.label as string,
      lessons: cat.typeIds.flatMap((id) => byCategoryId.get(id) ?? []),
    })).filter((s) => s.lessons.length > 0)

  const knownIds = new Set<number>(LESSON_CATEGORIES.flatMap((c) => [...c.typeIds]))
  const uncategorized = lessons.filter((l) => !knownIds.has(l.classTypeId))
  if (uncategorized.length > 0) sections.push({ label: 'Other', lessons: uncategorized })

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.label} className="border border-border rounded-md overflow-hidden">
          <div className="px-3 py-2 bg-muted/60 border-b border-border">
            <h3 className="font-semibold text-sm">
              {section.label}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({section.lessons.length})
              </span>
            </h3>
          </div>
          <RowHeader />
          {section.lessons.map((lesson) => (
            <LessonRow
              key={lesson.index}
              lesson={lesson}
              onClick={() => onLessonClick(lesson.index)}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
