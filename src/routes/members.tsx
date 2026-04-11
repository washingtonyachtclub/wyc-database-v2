import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import { z } from 'zod'
import { columns } from '../components/members/columns'
import { FilterControls } from '../components/members/FilterControls'
import { PaginationControls } from '../components/members/PaginationControls'
import { DataTable } from '../components/ui/DataTable'
import type { MemberFilters } from '@/domains/members/filter-types'
import { requirePrivilegeForRoute } from '../lib/route-guards'
import { getCategoriesQueryOptions, getMembersQueryOptions } from '@/domains/members/query-options'
import { getQuartersQueryOptions } from '@/domains/quarters/query-options'

// ===== ROUTE DEFINITION =====

const memberSearchSchema = z.object({
  pageIndex: z.number().catch(0),
  pageSize: z.number().catch(10),
  wycId: z.string().optional(),
  name: z.string().optional(),
  category: z.number().optional(),
  expireQtr: z.number().optional(),
  expireQtrMode: z.enum(['exactly', 'atLeast']).catch('exactly'),
  sortColumn: z.string().optional(),
  sortDesc: z.boolean().catch(false),
})

export const Route = createFileRoute('/members')({
  validateSearch: memberSearchSchema,
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/members')
  },
  loaderDeps: ({
    search: {
      pageIndex,
      pageSize,
      wycId,
      name,
      category,
      expireQtr,
      expireQtrMode,
      sortColumn,
      sortDesc,
    },
  }) => {
    const expireQtrFilter = expireQtr ? { quarter: expireQtr, mode: expireQtrMode } : undefined

    const filters: MemberFilters | undefined =
      wycId || name || category !== undefined || expireQtrFilter
        ? {
            wycId,
            name,
            category,
            expireQtrFilter,
          }
        : undefined

    const sorting =
      sortColumn && (sortColumn === 'expireQtrSchoolText' || sortColumn === 'joinDate')
        ? { id: sortColumn, desc: sortDesc }
        : undefined

    return {
      pageIndex,
      pageSize,
      filters,
      sorting,
    }
  },
  loader: ({ context, deps: { pageIndex, pageSize, filters, sorting } }) => {
    return context.queryClient.ensureQueryData(
      getMembersQueryOptions(pageIndex, pageSize, filters, sorting),
    )
  },
  component: App,
})

// ===== PAGE COMPONENT =====

function App() {
  const navigate = useNavigate({ from: '/members' })
  const { wycId, name, category } = Route.useSearch()
  const { pageIndex, pageSize, filters, sorting } = Route.useLoaderDeps()
  const expireQtrFilter = filters?.expireQtrFilter

  const { data: categories = [] } = useQuery(getCategoriesQueryOptions())
  const { data: quarters = [] } = useQuery(getQuartersQueryOptions())

  const { data: membersResponse } = useSuspenseQuery(
    getMembersQueryOptions(pageIndex, pageSize, filters, sorting),
  )

  const members = membersResponse.data
  const totalCount = membersResponse.totalCount
  const pageCount = Math.ceil(totalCount / pageSize)

  const table = useReactTable({
    data: members,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount,
    state: {
      pagination: {
        pageIndex,
        pageSize,
      },
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

  const handleFilterChange = (changes: Partial<MemberFilters>) => {
    navigate({
      search: (prev) => ({
        ...prev,
        pageIndex: 0,
        ...('wycId' in changes && { wycId: changes.wycId }),
        ...('name' in changes && { name: changes.name }),
        ...('category' in changes && { category: changes.category }),
        ...('expireQtrFilter' in changes && {
          expireQtr: changes.expireQtrFilter?.quarter,
          expireQtrMode: changes.expireQtrFilter?.mode,
        }),
      }),
      replace: true,
    })
  }

  const handleClearFilters = () => {
    navigate({
      search: (prev) => ({
        ...prev,
        pageIndex: 0,
        wycId: undefined,
        name: undefined,
        category: undefined,
        expireQtr: undefined,
      }),
      replace: true,
    })
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">WYC Members</h2>
      <FilterControls
        wycId={wycId}
        name={name}
        category={category}
        expireQtrFilter={expireQtrFilter}
        categories={categories}
        quarters={quarters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />
      <PaginationControls table={table} pageCount={pageCount} totalCount={totalCount} />
      <DataTable table={table} />
      <PaginationControls table={table} pageCount={pageCount} totalCount={totalCount} />
    </div>
  )
}
