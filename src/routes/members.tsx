import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { useState } from 'react'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { columns } from '../components/members/columns'
import { PaginationControls } from '../components/members/PaginationControls'
import { FilterControls } from '../components/members/FilterControls'
import { AddMemberForm } from '../components/members/AddMemberForm'
import {
  getCategoriesQueryOptions,
  getMembersQueryOptions,
  getQuartersQueryOptions,
} from '../lib/members-query-options'

// ===== ROUTE DEFINITION =====

export const Route = createFileRoute('/members')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      pageIndex: Number(search.pageIndex) || 0,
      pageSize: Number(search.pageSize) || 10,
      wycId: search.wycId as string | undefined,
      name: search.name as string | undefined,
      category: search.category ? Number(search.category) : undefined,
      expireQtr: search.expireQtr ? Number(search.expireQtr) : undefined,
      expireQtrMode:
        (search.expireQtrMode === 'exactly' || search.expireQtrMode === 'atLeast'
          ? search.expireQtrMode
          : undefined) as 'exactly' | 'atLeast' | undefined,
      sortColumn: search.sortColumn as string | undefined,
      sortDesc: search.sortDesc === 'true' || search.sortDesc === true,
    }
  },
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: { redirect: '/members' },
      })
    }
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
    const filters =
      wycId || name || category !== undefined || expireQtr !== undefined
        ? {
            wycId,
            name,
            category,
            expireQtr,
            expireQtrMode,
          }
        : undefined

    const sorting =
      sortColumn && (sortColumn === 'expireQtr' || sortColumn === 'joinDate')
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
  const {
    pageIndex,
    pageSize,
    wycId,
    name,
    category,
    expireQtr,
    expireQtrMode,
    sortColumn,
    sortDesc,
  } = Route.useSearch()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)

  const { data: categories = [] } = useQuery(getCategoriesQueryOptions())
  const { data: quarters = [] } = useQuery(getQuartersQueryOptions())

  const filters =
    wycId || name || category !== undefined || expireQtr !== undefined
      ? {
          wycId,
          name,
          category,
          expireQtr,
          expireQtrMode: expireQtrMode || 'exactly',
        }
      : undefined

  const sorting =
    sortColumn && (sortColumn === 'expireQtr' || sortColumn === 'joinDate')
      ? { id: sortColumn, desc: sortDesc }
      : undefined

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
      sorting: sorting
        ? [{ id: sorting.id, desc: sorting.desc }]
        : [],
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
          wycId,
          name,
          category,
          expireQtr,
          expireQtrMode,
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
          wycId,
          name,
          category,
          expireQtr,
          expireQtrMode,
          sortColumn: sort?.id,
          sortDesc: sort?.desc || false,
        },
        replace: true,
      })
    },
  })

  const handleFilterChange = (newFilters: {
    wycId?: string
    name?: string
    category?: number
    expireQtr?: number
    expireQtrMode?: 'exactly' | 'atLeast'
  }) => {
    navigate({
      search: {
        pageIndex: 0,
        pageSize,
        wycId: newFilters.wycId,
        name: newFilters.name,
        category: newFilters.category,
        expireQtr: newFilters.expireQtr,
        expireQtrMode: newFilters.expireQtrMode || 'exactly',
        sortColumn,
        sortDesc,
      },
      replace: true,
    })
  }

  const handleClearFilters = () => {
    navigate({
      search: {
        pageIndex: 0,
        pageSize,
        wycId: undefined,
        name: undefined,
        category: undefined,
        expireQtr: undefined,
        expireQtrMode: undefined,
        sortColumn,
        sortDesc,
      },
      replace: true,
    })
  }

  const handleFormSuccess = () => {
    alert('Member added successfully!')
    setFormKey((prev) => prev + 1)
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">WYC Members</h2>
      <button
        onClick={() => setIsFormOpen(true)}
        className="mb-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90"
      >
        Add Member
      </button>
      <AddMemberForm
        key={formKey}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleFormSuccess}
      />
      <FilterControls
        wycId={wycId}
        name={name}
        category={category}
        expireQtr={expireQtr}
        expireQtrMode={expireQtrMode || 'exactly'}
        categories={categories}
        quarters={quarters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />
      <PaginationControls
        table={table}
        pageCount={pageCount}
        totalCount={totalCount}
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
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
      />
    </div>
  )
}
