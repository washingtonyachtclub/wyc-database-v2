import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { columns } from '../components/lessons/columns'
import { LessonCard } from '../components/lessons/LessonCard'
import { PaginationControls } from '../components/members/PaginationControls'
import {
  getAllLessonsQueryOptions,
  getQuarterLessonsQueryOptions,
} from '../lib/lessons-query-options'
import type { LessonRow } from '../lib/lessons-server-fns'
import { LessonFormModal } from '../components/lessons/LessonFormModal'
import { isLessonUpcoming } from '../lib/date-utils'

export const Route = createFileRoute('/lessons')({
  validateSearch: (search: Record<string, unknown>) => ({
    pageIndex: Number(search.pageIndex) || 0,
    pageSize: Number(search.pageSize) || 10,
    sortColumn: search.sortColumn as string | undefined,
    sortDesc: search.sortDesc === 'true' || search.sortDesc === true,
  }),
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
      sortColumn && sortColumn === 'calendarDate'
        ? { id: sortColumn, desc: sortDesc }
        : undefined
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

function isMyLesson(lesson: LessonRow, userId: number) {
  return lesson.instructor1 === userId || lesson.instructor2 === userId
}

function LessonsPage() {
  const navigate = useNavigate({ from: '/lessons' })
  const { pageIndex, pageSize, sortColumn, sortDesc } = Route.useSearch()
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false)
  const [lessonInEdit, setLessonInEdit] = useState<LessonRow | null>(null)

  const sorting =
    sortColumn && sortColumn === 'calendarDate'
      ? { id: sortColumn, desc: sortDesc }
      : undefined

  const { data: quarterData } = useQuery(getQuarterLessonsQueryOptions())
  const { data: allLessonsResponse } = useSuspenseQuery(
    getAllLessonsQueryOptions(pageIndex, pageSize, sorting),
  )

  const quarterLessons = quarterData?.data ?? []
  const currentQuarter = quarterData?.currentQuarter ?? 0
  const userId = quarterData?.userId ?? 0

  const {
    myUpcoming,
    otherUpcoming,
    pastThisQuarter,
    futureLessons,
  } = useMemo(() => {
    const thisQuarterLessons: LessonRow[] = []
    const future: LessonRow[] = []

    for (const lesson of quarterLessons) {
      if (lesson.expire !== null && lesson.expire > currentQuarter) {
        future.push(lesson)
      } else {
        thisQuarterLessons.push(lesson)
      }
    }

    const myUpcomingLessons: LessonRow[] = []
    const otherUpcomingLessons: LessonRow[] = []
    const pastLessonsThisQuarter: LessonRow[] = []

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
        typeof updater === 'function'
          ? updater({ pageIndex, pageSize })
          : updater
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

  return (
    <div className="p-4 space-y-8">
      <div className="flex justify-start">
        <button
          onClick={() => {
            setLessonInEdit(null)
            setIsLessonModalOpen(true)
          }}
          className="mb-4 px-4 py-2 bg-accent text-accent-foreground rounded-md border border-accent-foreground/20 hover:opacity-90 font-medium"
        >
          New Lesson
        </button>
      </div>

      {/* My Upcoming Lessons */}
      <section>
        <h2 className="text-2xl font-bold mb-4">My upcoming lessons</h2>
        {myUpcoming.length === 0 ? (
          <p className="text-muted-foreground">
            You have no upcoming lessons you&apos;re instructing this quarter.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {myUpcoming.map((lesson) => (
              <LessonCard
                key={lesson.index}
                lesson={lesson}
                onClick={() => {
                  setLessonInEdit(lesson)
                  setIsLessonModalOpen(true)
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Other Lessons This Quarter */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Other Lessons This Quarter</h2>
        {otherUpcoming.length === 0 && pastThisQuarter.length === 0 ? (
          <p className="text-muted-foreground">
            No other lessons this quarter.
          </p>
        ) : (
          <div className="space-y-4">
            {otherUpcoming.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Upcoming</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {otherUpcoming.map((lesson) => (
                    <LessonCard
                      key={lesson.index}
                      lesson={lesson}
                      onClick={() => {
                        setLessonInEdit(lesson)
                        setIsLessonModalOpen(true)
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            {pastThisQuarter.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Past</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {pastThisQuarter.map((lesson) => (
                    <LessonCard
                      key={lesson.index}
                      lesson={lesson}
                      onClick={() => {
                        setLessonInEdit(lesson)
                        setIsLessonModalOpen(true)
                      }}
                    />
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
          <p className="text-muted-foreground">
            No lessons scheduled for future quarters.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {futureLessons.map((lesson) => (
              <LessonCard
                key={lesson.index}
                lesson={lesson}
                onClick={() => {
                  setLessonInEdit(lesson)
                  setIsLessonModalOpen(true)
                }}
              />
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
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="bg-muted">
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort()
                    const sortDirection = header.column.getIsSorted()
                    return (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-left font-semibold text-sm border-b"
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={
                              canSort
                                ? 'flex items-center gap-2 cursor-pointer select-none hover:text-foreground'
                                : ''
                            }
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {canSort && (
                              <span className="inline-flex items-center">
                                {sortDirection === 'asc' ? (
                                  <ArrowUp className="h-4 w-4" />
                                ) : sortDirection === 'desc' ? (
                                  <ArrowDown className="h-4 w-4" />
                                ) : (
                                  <span className="text-muted-foreground opacity-50">
                                    ↕
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b hover:bg-accent transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-sm">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls
          table={table}
          pageCount={pageCount}
          totalCount={totalCount}
          label="total lessons"
        />
      </section>

      <LessonFormModal
        isOpen={isLessonModalOpen}
        onClose={() => setIsLessonModalOpen(false)}
        lesson={lessonInEdit}
        currentQuarter={currentQuarter}
        onSuccess={() => {
          alert('Lesson saved successfully!')
        }}
      />
    </div>
  )
}
