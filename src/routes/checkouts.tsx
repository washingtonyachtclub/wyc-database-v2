import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import { z } from 'zod'
import { columns } from '../components/checkouts/columns'
import { CheckoutFilterControls } from '../components/checkouts/CheckoutFilterControls'
import { PaginationControls } from '../components/members/PaginationControls'
import { DataTable } from '../components/ui/DataTable'
import type { CheckoutFilters } from '@/domains/checkouts/filter-types'
import {
  getAllCheckoutsQueryOptions,
  getCheckoutBoatTypesQueryOptions,
} from '@/domains/checkouts/query-options'
import { requirePrivilegeForRoute } from '../lib/route-guards'

const checkoutSearchSchema = z.object({
  pageIndex: z.number().catch(0),
  pageSize: z.number().catch(10),
  boatId: z.number().optional(),
  fleet: z.string().optional(),
  memberWycNumber: z.number().optional(),
  since: z.string().optional(),
  until: z.string().optional(),
  sortColumn: z.string().optional(),
  sortDesc: z.boolean().catch(false),
})

export const Route = createFileRoute('/checkouts')({
  validateSearch: checkoutSearchSchema,
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/checkouts')
  },
  loaderDeps: ({
    search: {
      pageIndex,
      pageSize,
      boatId,
      fleet,
      memberWycNumber,
      since,
      until,
      sortColumn,
      sortDesc,
    },
  }) => {
    const filters: CheckoutFilters | undefined =
      boatId !== undefined ||
      fleet !== undefined ||
      memberWycNumber !== undefined ||
      since !== undefined ||
      until !== undefined
        ? { boatId, fleet, memberWycNumber, since, until }
        : undefined

    const sorting =
      sortColumn && sortColumn in checkoutSortableColumns
        ? { id: sortColumn, desc: sortDesc }
        : undefined

    return { pageIndex, pageSize, filters, sorting }
  },
  loader: ({ context, deps: { pageIndex, pageSize, filters, sorting } }) => {
    context.queryClient.ensureQueryData(getCheckoutBoatTypesQueryOptions())
    return context.queryClient.ensureQueryData(
      getAllCheckoutsQueryOptions(pageIndex, pageSize, filters, sorting),
    )
  },
  component: CheckoutsPage,
})

const checkoutSortableColumns: Record<string, true> = {
  index: true,
  memberWycNumber: true,
  boatName: true,
  timeDeparture: true,
  expectedReturn: true,
  timeReturn: true,
  ratingName: true,
}

function CheckoutsPage() {
  const navigate = useNavigate({ from: '/checkouts' })
  const { boatId, fleet, memberWycNumber, since, until } = Route.useSearch()
  const { pageIndex, pageSize, filters, sorting } = Route.useLoaderDeps()

  const { data: boatTypes = [] } = useQuery(getCheckoutBoatTypesQueryOptions())
  const { data: checkoutsResponse } = useSuspenseQuery(
    getAllCheckoutsQueryOptions(pageIndex, pageSize, filters, sorting),
  )

  const checkouts = checkoutsResponse.data
  const totalCount = checkoutsResponse.totalCount
  const pageCount = Math.ceil(totalCount / pageSize)

  const table = useReactTable({
    data: checkouts,
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

  const handleFilterChange = (changes: Partial<CheckoutFilters>) => {
    navigate({
      search: (prev) => ({
        ...prev,
        pageIndex: 0,
        ...('boatId' in changes && { boatId: changes.boatId }),
        ...('fleet' in changes && { fleet: changes.fleet }),
        ...('memberWycNumber' in changes && { memberWycNumber: changes.memberWycNumber }),
        ...('since' in changes && { since: changes.since }),
        ...('until' in changes && { until: changes.until }),
      }),
      replace: true,
    })
  }

  const handleClearFilters = () => {
    navigate({
      search: (prev) => ({
        ...prev,
        pageIndex: 0,
        boatId: undefined,
        fleet: undefined,
        memberWycNumber: undefined,
        since: undefined,
        until: undefined,
      }),
      replace: true,
    })
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Boat Checkouts</h2>
      <CheckoutFilterControls
        boatId={boatId}
        fleet={fleet}
        memberWycNumber={memberWycNumber}
        since={since}
        until={until}
        boatTypes={boatTypes}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />
      <PaginationControls table={table} pageCount={pageCount} totalCount={totalCount} />
      <DataTable
        table={table}
        rowClassName={(row) =>
          row.original.isOut ? 'bg-yellow-50 dark:bg-yellow-950/20' : undefined
        }
      />
      <PaginationControls table={table} pageCount={pageCount} totalCount={totalCount} />
    </div>
  )
}
