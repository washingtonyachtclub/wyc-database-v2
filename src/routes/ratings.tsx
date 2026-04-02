import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import { useState } from 'react'
import { z } from 'zod'
import { AddRatingModal } from '../components/ratings/AddRatingModal'
import { columns } from '../components/ratings/columns'
import { RatingFilterControls } from '../components/ratings/RatingFilterControls'
import { PaginationControls } from '../components/members/PaginationControls'
import { Button } from '../components/ui/button'
import { Plus } from 'lucide-react'
import { DataTable } from '../components/ui/DataTable'
import type { RatingFilters } from '@/domains/ratings/filter-types'
import { useCurrentUser } from '@/lib/auth/auth-query-options'
import { requirePrivilegeForRoute } from '../lib/route-guards'
import {
  getAllRatingsQueryOptions,
  getRatingTypesQueryOptions,
} from '@/domains/ratings/query-options'

const ratingSearchSchema = z.object({
  pageIndex: z.number().catch(0),
  pageSize: z.number().catch(10),
  memberWycNumber: z.number().optional(),
  ratingIndex: z.number().optional(),
  sortColumn: z.string().optional(),
  sortDesc: z.boolean().catch(false),
})

export const Route = createFileRoute('/ratings')({
  validateSearch: ratingSearchSchema,
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/ratings')
  },
  loaderDeps: ({ search: { pageIndex, pageSize, memberWycNumber, ratingIndex, sortColumn, sortDesc } }) => {
    const filters: RatingFilters | undefined =
      memberWycNumber !== undefined || ratingIndex !== undefined ? { memberWycNumber, ratingIndex } : undefined

    const sorting =
      sortColumn && sortColumn in ratingSortableColumns
        ? { id: sortColumn, desc: sortDesc }
        : undefined

    return { pageIndex, pageSize, filters, sorting }
  },
  loader: ({ context, deps: { pageIndex, pageSize, filters, sorting } }) => {
    // Prefetch rating types (used by useQuery in component, not critical path)
    context.queryClient.ensureQueryData(getRatingTypesQueryOptions())
    // Return main data promise directly so Router awaits it and keeps old page visible
    return context.queryClient.ensureQueryData(
      getAllRatingsQueryOptions(pageIndex, pageSize, filters, sorting),
    )
  },
  component: RatingsPage,
})

// Columns that support server-side sorting
const ratingSortableColumns: Record<string, true> = {
  date: true,
  ratingText: true,
  memberName: true,
  examinerName: true,
}

function RatingsPage() {
  const navigate = useNavigate({ from: '/ratings' })
  const { memberWycNumber, ratingIndex } = Route.useSearch()
  const { pageIndex, pageSize, filters, sorting } = Route.useLoaderDeps()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const { user } = useCurrentUser()

  const { data: ratingTypes = [] } = useQuery(getRatingTypesQueryOptions())
  const { data: ratingsResponse } = useSuspenseQuery(
    getAllRatingsQueryOptions(pageIndex, pageSize, filters, sorting),
  )

  const ratings = ratingsResponse.data
  const totalCount = ratingsResponse.totalCount
  const pageCount = Math.ceil(totalCount / pageSize)

  const table = useReactTable({
    data: ratings,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
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

  const handleFilterChange = (changes: Partial<RatingFilters>) => {
    navigate({
      search: (prev) => ({
        ...prev,
        pageIndex: 0,
        ...('memberWycNumber' in changes && { memberWycNumber: changes.memberWycNumber }),
        ...('ratingIndex' in changes && { ratingIndex: changes.ratingIndex }),
      }),
      replace: true,
    })
  }

  const handleClearFilters = () => {
    navigate({
      search: (prev) => ({
        ...prev,
        pageIndex: 0,
        memberWycNumber: undefined,
        ratingIndex: undefined,
      }),
      replace: true,
    })
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Ratings</h2>
      <Button onClick={() => setIsAddModalOpen(true)} className="mb-4">
        <Plus className="h-4 w-4" />
        New Rating
      </Button>
      <RatingFilterControls
        memberWycNumber={memberWycNumber}
        ratingIndex={ratingIndex}
        ratingTypes={ratingTypes}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />
      <PaginationControls table={table} pageCount={pageCount} totalCount={totalCount} />
      <DataTable table={table} />
      <PaginationControls table={table} pageCount={pageCount} totalCount={totalCount} />

      {isAddModalOpen && (
        <AddRatingModal
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {}}
          currentUserWycNumber={user?.wycNumber ?? 0}
        />
      )}
    </div>
  )
}
