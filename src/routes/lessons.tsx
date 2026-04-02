import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { isDevEnvironment } from '@/lib/env'
import type { Lesson, RichLesson } from '@/domains/lessons/schema'
import type { LessonFilters } from '@/domains/lessons/filter-types'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { z } from 'zod'
import { columns } from '../components/lessons/columns'
import { LessonCard } from '../components/lessons/LessonCard'
import { LessonFilterControls } from '../components/lessons/LessonFilterControls'
import { LessonFormModal } from '../components/lessons/LessonEditorModal'
import { PaginationControls } from '../components/members/PaginationControls'
import { Button } from '../components/ui/button'
import { Plus } from 'lucide-react'
import { DataTable } from '../components/ui/DataTable'
import { isLessonUpcoming } from '../lib/date-utils'
import { requirePrivilegeForRoute } from '../lib/route-guards'
import {
  getAllLessonsQueryOptions,
  getClassTypesQueryOptions,
  getQuarterLessonsQueryOptions,
} from '@/domains/lessons/query-options'
import { getQuartersQueryOptions } from '@/domains/members/query-options'

const lessonSearchSchema = z.object({
  pageIndex: z.number().catch(0),
  pageSize: z.number().catch(10),
  classTypeId: z.number().optional(),
  instructor: z.number().optional(),
  expireQtr: z.number().optional(),
  expireQtrMode: z.enum(['exactly', 'atLeast']).catch('exactly'),
  display: z.boolean().optional(),
  sortColumn: z.string().optional(),
  sortDesc: z.boolean().catch(false),
})

export const Route = createFileRoute('/lessons')({
  validateSearch: lessonSearchSchema,
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/lessons')
  },
  loaderDeps: ({
    search: {
      pageIndex,
      pageSize,
      classTypeId,
      instructor,
      expireQtr,
      expireQtrMode,
      display,
      sortColumn,
      sortDesc,
    },
  }) => {
    const expireQtrFilter = expireQtr ? { quarter: expireQtr, mode: expireQtrMode } : undefined

    const filters: LessonFilters | undefined =
      classTypeId !== undefined || instructor !== undefined || expireQtrFilter || display === true
        ? { classTypeId, instructor, expireQtrFilter, display }
        : undefined

    const sorting =
      sortColumn && sortColumn === 'calendarDate' ? { id: sortColumn, desc: sortDesc } : undefined

    return { pageIndex, pageSize, filters, sorting }
  },
  loader: ({ context, deps: { pageIndex, pageSize, filters, sorting } }) => {
    context.queryClient.ensureQueryData(getQuarterLessonsQueryOptions())
    return context.queryClient.ensureQueryData(
      getAllLessonsQueryOptions(pageIndex, pageSize, filters, sorting),
    )
  },
  component: LessonsPage,
})

function isMyLesson(lesson: Lesson, userId: number) {
  return lesson.instructor1 === userId || lesson.instructor2 === userId
}

function LessonsPage() {
  const navigate = useNavigate({ from: '/lessons' })
  const { classTypeId, instructor, display } = Route.useSearch()
  const { pageIndex, pageSize, filters, sorting } = Route.useLoaderDeps()
  const expireQtrFilter = filters?.expireQtrFilter
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)
  const [testBoom, setTestBoom] = useState(false)

  const { data: classTypes = [] } = useQuery(getClassTypesQueryOptions())
  const { data: quarters = [] } = useQuery(getQuartersQueryOptions())
  const { data: quarterData } = useQuery(getQuarterLessonsQueryOptions())
  const { data: allLessonsResponse } = useSuspenseQuery(
    getAllLessonsQueryOptions(pageIndex, pageSize, filters, sorting),
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
        search: (prev) => ({
          ...prev,
          pageIndex: newPagination.pageIndex,
          pageSize: newPagination.pageSize,
        }),
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
        search: (prev) => ({
          ...prev,
          pageIndex: 0,
          sortColumn: sort?.id,
          sortDesc: sort?.desc || false,
        }),
        replace: true,
      })
    },
  })

  const handleFilterChange = (changes: Partial<LessonFilters>) => {
    navigate({
      search: (prev) => ({
        ...prev,
        pageIndex: 0,
        ...('classTypeId' in changes && { classTypeId: changes.classTypeId }),
        ...('instructor' in changes && { instructor: changes.instructor }),
        ...('expireQtrFilter' in changes && {
          expireQtr: changes.expireQtrFilter?.quarter,
          expireQtrMode: changes.expireQtrFilter?.mode,
        }),
        ...('display' in changes && { display: changes.display }),
      }),
      replace: true,
    })
  }

  const handleClearFilters = () => {
    navigate({
      search: (prev) => ({
        ...prev,
        pageIndex: 0,
        classTypeId: undefined,
        instructor: undefined,
        expireQtr: undefined,
        display: undefined,
      }),
      replace: true,
    })
  }

  function goToLesson(lessonIndex: number) {
    navigate({ to: '/lessons/$lessonIndex', params: { lessonIndex: String(lessonIndex) } })
  }

  // TODO: Remove after verifying ErrorAlert and error boundary
  function Boom() {
    throw new Error('Test error boundary')
    return null
  }

  return (
    <div className="p-4 space-y-8">
      {isDevEnvironment() && (
        <div className="border border-dashed border-yellow-500 rounded p-4 space-y-3">
          <p className="text-sm font-medium text-yellow-600">Dev: Error display tests</p>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setTestError('Failed to create lesson')}
            >
              Test ErrorAlert
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setTestBoom(true)}
            >
              Test Error Boundary
            </Button>
            {testError && (
              <Button variant="outline" size="sm" onClick={() => setTestError(null)}>
                Clear
              </Button>
            )}
          </div>
          <ErrorAlert error={testError} action="Creating a lesson" />
          {testBoom && <Boom />}
        </div>
      )}

      <div className="flex justify-start">
        <Button onClick={() => setIsLessonModalOpen(true)} className="mb-4">
          <Plus className="h-4 w-4" />
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
        <LessonFilterControls
          classTypeId={classTypeId}
          instructor={instructor}
          expireQtrFilter={expireQtrFilter}
          display={display}
          classTypes={classTypes}
          quarters={quarters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />
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
