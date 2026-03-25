import type { Lesson, RichLesson } from '@/db/lesson-schema'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { z } from 'zod'
import { columns } from '../components/lessons/columns'
import { LessonCard } from '../components/lessons/LessonCard'
import { LessonFormModal } from '../components/lessons/LessonEditorModal'
import { PaginationControls } from '../components/members/PaginationControls'
import { Button } from '../components/ui/button'
import { DataTable } from '../components/ui/DataTable'
import { isLessonUpcoming } from '../lib/date-utils'
import {
  getAllLessonsQueryOptions,
  getQuarterLessonsQueryOptions,
} from '../lib/lessons-query-options'

const lessonSearchSchema = z.object({
  pageIndex: z.number().catch(0),
  pageSize: z.number().catch(10),
  sortColumn: z.string().optional(),
  sortDesc: z.boolean().catch(false),
})

export const Route = createFileRoute('/lessons')({
  validateSearch: lessonSearchSchema,
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: { redirect: '/lessons' },
      })
    }
  },
  loaderDeps: ({ search: { pageIndex, pageSize, sortColumn, sortDesc } }) => {
    const sorting =
      sortColumn && sortColumn === 'calendarDate' ? { id: sortColumn, desc: sortDesc } : undefined
    return { pageIndex, pageSize, sorting }
  },
  loader: ({ context, deps: { pageIndex, pageSize, sorting } }) => {
    context.queryClient.ensureQueryData(getQuarterLessonsQueryOptions())
    return context.queryClient.ensureQueryData(
      getAllLessonsQueryOptions(pageIndex, pageSize, sorting),
    )
  },
  component: LessonsPage,
})

function isMyLesson(lesson: Lesson, userId: number) {
  return lesson.instructor1 === userId || lesson.instructor2 === userId
}

function LessonsPage() {
  const navigate = useNavigate({ from: '/lessons' })
  const { pageIndex, pageSize, sortColumn, sortDesc } = Route.useSearch()
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false)

  const sorting =
    sortColumn && sortColumn === 'calendarDate' ? { id: sortColumn, desc: sortDesc } : undefined

  const { data: quarterData } = useQuery(getQuarterLessonsQueryOptions())
  const { data: allLessonsResponse } = useSuspenseQuery(
    getAllLessonsQueryOptions(pageIndex, pageSize, sorting),
  )

  const quarterLessons = quarterData?.data ?? []
  const currentQuarter = quarterData?.currentQuarter ?? 0
  const userId = quarterData?.userId ?? 0

  const { myUpcoming, otherUpcoming, pastThisQuarter, futureLessons } = useMemo(() => {
    const thisQuarterLessons: RichLesson[] = []
    const future: RichLesson[] = []

    for (const lesson of quarterLessons) {
      if (lesson.expire > currentQuarter) {
        future.push(lesson)
      } else {
        thisQuarterLessons.push(lesson)
      }
    }

    const myUpcomingLessons = []
    const otherUpcomingLessons = []
    const pastLessonsThisQuarter = []

    for (const lesson of thisQuarterLessons) {
      const upcoming = isLessonUpcoming(lesson.calendarDate)

      if (upcoming) {
        if (isMyLesson(lesson, userId)) {
          myUpcomingLessons.push(lesson)
        } else {
          otherUpcomingLessons.push(lesson)
        }
      } else {
        pastLessonsThisQuarter.push(lesson)
      }
    }

    return {
      myUpcoming: myUpcomingLessons,
      otherUpcoming: otherUpcomingLessons,
      pastThisQuarter: pastLessonsThisQuarter,
      futureLessons: future,
    }
  }, [quarterLessons, currentQuarter, userId])

  const allLessons = allLessonsResponse.data
  const totalCount = allLessonsResponse.totalCount
  const pageCount = Math.ceil(totalCount / pageSize)

  const table = useReactTable({
    data: allLessons,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount,
    state: {
      pagination: { pageIndex, pageSize },
      sorting: sorting ? [{ id: sorting.id, desc: sorting.desc }] : [],
    },
    onPaginationChange: (updater) => {
      const newPagination =
        typeof updater === 'function' ? updater({ pageIndex, pageSize }) : updater
      navigate({
        search: {
          pageIndex: newPagination.pageIndex,
          pageSize: newPagination.pageSize,
          sortColumn,
          sortDesc,
        },
        replace: true,
      })
    },
    onSortingChange: (updater) => {
      const newSorting =
        typeof updater === 'function'
          ? updater(sorting ? [{ id: sorting.id, desc: sorting.desc }] : [])
          : updater
      const sort = newSorting[0]
      navigate({
        search: {
          pageIndex: 0,
          pageSize,
          sortColumn: sort?.id,
          sortDesc: sort?.desc || false,
        },
        replace: true,
      })
    },
  })

  function goToLesson(lessonIndex: number) {
    navigate({ to: '/lessons/$lessonIndex', params: { lessonIndex: String(lessonIndex) } })
  }

  return (
    <div className="p-4 space-y-8">
      <div className="flex justify-start">
        <Button variant="secondary" onClick={() => setIsLessonModalOpen(true)} className="mb-4">
          New Lesson
        </Button>
      </div>

      {/* My Upcoming Lessons */}
      <section>
        <h2 className="text-2xl font-bold mb-4">My Upcoming Lessons</h2>
        {myUpcoming.length === 0 ? (
          <p className="text-muted-foreground">
            You are not instructing any upcoming lessons this quarter.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {myUpcoming.map((lesson) => (
              <LessonCard key={lesson.index} lesson={lesson} onClick={() => goToLesson(lesson.index)} />
            ))}
          </div>
        )}
      </section>

      {/* Other Lessons This Quarter */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Other Lessons this Quarter</h2>
        {otherUpcoming.length === 0 && pastThisQuarter.length === 0 ? (
          <p className="text-muted-foreground">No other lessons this quarter.</p>
        ) : (
          <div className="space-y-4">
            {otherUpcoming.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Upcoming</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {otherUpcoming.map((lesson) => (
                    <LessonCard key={lesson.index} lesson={lesson} onClick={() => goToLesson(lesson.index)} />
                  ))}
                </div>
              </div>
            )}
            {pastThisQuarter.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Past</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {pastThisQuarter.map((lesson) => (
                    <LessonCard key={lesson.index} lesson={lesson} onClick={() => goToLesson(lesson.index)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Future Quarter Lessons */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Future Quarter Lessons</h2>
        {futureLessons.length === 0 ? (
          <p className="text-muted-foreground">No lessons scheduled for future quarters.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {futureLessons.map((lesson) => (
              <LessonCard key={lesson.index} lesson={lesson} onClick={() => goToLesson(lesson.index)} />
            ))}
          </div>
        )}
      </section>

      {/* All Lessons (paginated table) */}
      <section>
        <h2 className="text-2xl font-bold mb-4">All Lessons</h2>
        <PaginationControls
          table={table}
          pageCount={pageCount}
          totalCount={totalCount}
          label="total lessons"
        />
        <DataTable table={table} />
        <PaginationControls
          table={table}
          pageCount={pageCount}
          totalCount={totalCount}
          label="total lessons"
        />
      </section>

      {isLessonModalOpen && (
        <LessonFormModal
          onClose={() => setIsLessonModalOpen(false)}
          currentQuarter={currentQuarter}
          onSuccess={() => {
            alert('Lesson saved successfully!')
          }}
        />
      )}
    </div>
  )
}
