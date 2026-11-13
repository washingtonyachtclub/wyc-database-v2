import { formatSessions } from '@/domains/lessons/format-sessions'
import type { RichLessonWithEnrollment } from '@/domains/lessons/schema'
import { LESSON_CATEGORIES } from '../../db/constants'
import { cn } from '../../lib/utils'

function lessonName(lesson: RichLessonWithEnrollment) {
  return lesson.subtype || lesson.type || 'Untitled Lesson'
}

function enrollmentLabel(lesson: RichLessonWithEnrollment) {
  const { enrolledCount, size } = lesson
  if (size > 0) return `${enrolledCount} / ${size}`
  return String(enrolledCount)
}

function isFull(lesson: RichLessonWithEnrollment) {
  return lesson.size > 0 && lesson.enrolledCount >= lesson.size
}

const ROW_GRID = 'grid grid-cols-[minmax(0,3fr)_minmax(0,3fr)_minmax(0,2fr)_minmax(0,1fr)] gap-3'

function LessonRow({ lesson, onClick }: { lesson: RichLessonWithEnrollment; onClick: () => void }) {
  const full = isFull(lesson)
  // One line per session would break the grid, so this row stays single-line.
  const when = formatSessions(lesson.sessions).join(', ')

  return (
    <div
      onClick={onClick}
      className={cn(
        ROW_GRID,
        'items-center px-3 py-2 border-b border-border text-sm hover:bg-accent cursor-pointer',
      )}
    >
      <div className="truncate font-medium">
        {lessonName(lesson)}
        {lesson.description && (
          <span className="ml-2 text-xs text-muted-foreground truncate">
            · {lesson.description}
          </span>
        )}
      </div>
      <div className="truncate text-foreground" title={when}>
        {when}
      </div>
      <div className="truncate text-muted-foreground">
        {[lesson.instructor1Name, lesson.instructor2Name].filter(Boolean).join(', ')}
      </div>
      <div className="text-right whitespace-nowrap tabular-nums">
        <span className={cn(full ? 'text-destructive font-medium' : 'text-muted-foreground')}>
          {enrollmentLabel(lesson)}
        </span>
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
      <div>Lesson</div>
      <div>When</div>
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
