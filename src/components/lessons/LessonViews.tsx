import type { RichLessonWithEnrollment } from '@/domains/lessons/schema'
import { AlertTriangle } from 'lucide-react'
import { isLessonUpcoming } from '../../lib/date-utils'
import { LESSON_CATEGORIES } from '../../db/constants'
import { cn } from '../../lib/utils'

function lessonName(lesson: RichLessonWithEnrollment) {
  return lesson.subtype || lesson.type || 'Untitled Lesson'
}

function lessonWarning(lesson: RichLessonWithEnrollment): string | null {
  const upcoming = isLessonUpcoming(lesson.calendarDate)
  if (upcoming && !lesson.display) return 'Upcoming but not displayed on website'
  if (!upcoming && lesson.display && lesson.calendarDate !== '0000-00-00') {
    return 'Past but still displayed on website'
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

function LessonRow({
  lesson,
  onClick,
}: {
  lesson: RichLessonWithEnrollment
  onClick: () => void
}) {
  const warning = lessonWarning(lesson)
  const full = isFull(lesson)

  return (
    <div
      onClick={onClick}
      className={cn(
        ROW_GRID,
        'items-center px-3 py-2 border-b border-border text-sm hover:bg-accent cursor-pointer',
      )}
    >
      <div className="w-4">
        {warning && (
          <span title={warning} aria-label={warning}>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </span>
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
      <div
        className={cn(
          'text-right whitespace-nowrap tabular-nums',
          full ? 'text-destructive font-medium' : 'text-muted-foreground',
        )}
      >
        {enrollmentLabel(lesson)}
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

  const sections: Array<{ label: string; lessons: RichLessonWithEnrollment[] }> = LESSON_CATEGORIES
    .map((cat) => ({
      label: cat.label as string,
      lessons: cat.typeIds.flatMap((id) => byCategoryId.get(id) ?? []),
    }))
    .filter((s) => s.lessons.length > 0)

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
