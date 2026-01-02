import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { asc, count, desc, eq, sql } from 'drizzle-orm'
import { memcat, noyes, quarters, wycDatabase } from 'src/db/schema'
import { createServerFn } from '@tanstack/react-start'
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import db from '../db/index'
import type { Member } from 'src/db/schema'
import type { Table } from '@tanstack/react-table'

export const memberSelectFields = {
  wycNumber: wycDatabase.wycNumber,
  first: sql<string>`COALESCE(${wycDatabase.first}, '')`.as('first'),
  last: sql<string>`COALESCE(${wycDatabase.last}, '')`.as('last'),
  category: sql<string>`COALESCE(${memcat.text}, 'Unknown')`.as('category'),
  expireQtr: sql<string>`COALESCE(${quarters.school}, 'N/A')`.as('expireQtr'),
  joinDate: wycDatabase.joinDate,
}

// ===== QUERY OPTIONS (Read operations) =====

const getMembersQueryOptions = (pageIndex: number, pageSize: number) =>
  queryOptions({
    queryKey: ['members', pageIndex, pageSize],
    queryFn: async () => {
      const result = await getMembersTable({
        data: { pageIndex, pageSize },
      })
      return result
    },
  })

const getMostRecentWycNumberQueryOptions = () =>
  queryOptions({
    queryKey: ['mostRecentWycNumber'],
    queryFn: getMostRecentWycNumber,
  })

// ===== SERVER FUNCTIONS =====

export const getMembersTable = createServerFn({ method: 'GET' })
  .inputValidator((input: { pageIndex: number; pageSize: number }) => {
    return {
      pageIndex: input.pageIndex,
      pageSize: input.pageSize,
    }
  })
  .handler(async ({ data }) => {
    try {
      const pageIndex = data.pageIndex
      const pageSize = data.pageSize
      const offset = pageIndex * pageSize

      const members = await db
        .select(memberSelectFields)
        .from(wycDatabase)
        .leftJoin(memcat, eq(memcat.index, wycDatabase.category))
        .leftJoin(quarters, eq(quarters.index, wycDatabase.expireQtr))
        .leftJoin(noyes, eq(noyes.index, wycDatabase.outToSea))
        .orderBy(desc(wycDatabase.joinDate))
        .limit(pageSize)
        .offset(offset)

      const [totalCountResult] = await db
        .select({ count: count() })
        .from(wycDatabase)
      const totalCount = totalCountResult.count

      return {
        data: members,
        totalCount,
      }
    } catch (error: any) {
      console.error('Database query error:', error)
      const errorMessage =
        error?.message || error?.toString() || 'Unknown database error'
      const errorCode = error?.code || 'NO_CODE'
      throw new Error(
        `Failed to fetch members: ${errorMessage} (Code: ${errorCode})`,
      )
    }
  })

export const getMostRecentWycNumber = createServerFn({ method: 'GET' }).handler(
  async () => {
    const result = await db
      .select({ wycNumber: wycDatabase.wycNumber })
      .from(wycDatabase)
      .orderBy(desc(wycDatabase.joinDate))
      .limit(1)
    return result[0]?.wycNumber ?? 0
  },
)

export const addMember = createServerFn({ method: 'POST' })
  .inputValidator((data: Member) => data)
  .handler(async ({ data }) => {
    try {
      const newMember = await db.insert(wycDatabase).values(data).$returningId()
      return { success: true, id: newMember, data }
    } catch (error: any) {
      // Provide more descriptive error messages
      let errorMessage = 'Failed to add member'

      if (
        error?.code === 'ER_DUP_ENTRY' ||
        error?.message?.includes('Duplicate entry')
      ) {
        errorMessage = `A member with WYC Number ${data.wycNumber} already exists. Please use a different number.`
      } else if (error?.code === 'ER_NO_DEFAULT_FOR_FIELD') {
        errorMessage = `Missing required field: ${error.message}`
      } else if (error?.code === 'ER_DATA_TOO_LONG') {
        errorMessage = `Data too long for one or more fields. Please check your input.`
      } else if (error?.code === 'ER_BAD_NULL_ERROR') {
        errorMessage = `Required field is null: ${error.message}`
      } else if (error?.message) {
        errorMessage = `Database error: ${error.message}`
      }

      throw new Error(errorMessage)
    }
  })

// ===== ROUTE DEFINITION =====

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      pageIndex: Number(search.pageIndex) || 0,
      pageSize: Number(search.pageSize) || 10,
    }
  },
  loaderDeps: ({ search: { pageIndex, pageSize } }) => ({
    pageIndex,
    pageSize,
  }),
  loader: ({ context, deps: { pageIndex, pageSize } }) => {
    return context.queryClient.ensureQueryData(
      getMembersQueryOptions(pageIndex, pageSize),
    )
  },
  component: App,
})

// ===== COLUMN DEFINITIONS =====

type MembersTableRow = {
  wycNumber: number
  first: string
  last: string
  category: string
  expireQtr: string
  joinDate: string
}

const columnHelper = createColumnHelper<MembersTableRow>()

const columns = [
  columnHelper.accessor('wycNumber', {
    header: 'WYC Number',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor(
    (row) => `${row.first || ''} ${row.last || ''}`.trim(),
    {
      id: 'name',
      header: 'Name',
      cell: (info) => info.getValue() || '—',
    },
  ),
  columnHelper.accessor('category', {
    header: 'Category',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('expireQtr', {
    header: 'Expire Qtr',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('joinDate', {
    header: 'Join Date (M/D/YYYY)',
    cell: (info) => {
      const date = info.getValue()
      return date ? new Date(date).toLocaleDateString() : '—'
    },
  }),
]

// ===== PAGINATION COMPONENT =====

function PaginationControls({
  table,
  pageCount,
  totalCount,
}: {
  table: Table<MembersTableRow>
  pageCount: number
  totalCount: number
}) {
  const pageSize = table.getState().pagination.pageSize

  return (
    <div className="flex items-center justify-between mt-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
          className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent flex items-center justify-center"
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent flex items-center justify-center"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent flex items-center justify-center"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={() => table.setPageIndex(pageCount - 1)}
          disabled={!table.getCanNextPage()}
          className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent flex items-center justify-center"
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {pageCount || 1}
        </span>
        <select
          value={pageSize}
          onChange={(e) => {
            table.setPageSize(Number(e.target.value))
          }}
          className="px-2 py-1 border rounded text-sm"
        >
          {[10, 20, 30, 50, 100].map((size) => (
            <option key={size} value={size}>
              Show {size}
            </option>
          ))}
        </select>
      </div>
      <div className="text-sm text-muted-foreground">
        {totalCount} total members
      </div>
    </div>
  )
}

// ===== COMPONENT =====

function App() {
  const queryClient = useQueryClient()
  const navigate = useNavigate({ from: '/' })
  const { pageIndex, pageSize } = Route.useSearch()

  const { data: membersResponse } = useSuspenseQuery(
    getMembersQueryOptions(pageIndex, pageSize),
  )

  const { data: mostRecentNumber } = useQuery(
    getMostRecentWycNumberQueryOptions(),
  )

  const members = membersResponse.data
  const totalCount = membersResponse.totalCount
  const pageCount = Math.ceil(totalCount / pageSize)

  const table = useReactTable({
    data: members,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
    state: {
      pagination: {
        pageIndex,
        pageSize,
      },
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
        },
        replace: true,
      })
    },
  })

  const addMemberMutation = useMutation({
    mutationFn: addMember,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['members'],
      })
      queryClient.invalidateQueries(getMostRecentWycNumberQueryOptions())
    },
  })

  const handleAddMember = async () => {
    try {
      // Use cached value if available, otherwise fetch
      const currentNumber =
        mostRecentNumber ??
        (await queryClient.ensureQueryData(
          getMostRecentWycNumberQueryOptions(),
        ))

      const newWycNumber = currentNumber + 1

      await addMemberMutation.mutateAsync({
        data: {
          last: 'Test',
          first: 'Member',
          streetAddress: '123 Main St',
          city: 'Boston',
          state: 'MA',
          zipCode: '02101',
          phone1: '555-0123',
          phone2: null,
          email: 'test@example.com',
          category: 1,
          wycNumber: newWycNumber,
          expireQtr: 4,
          studentId: null,
          password: 'test123',
          outToSea: 0,
          joinDate: new Date().toISOString(),
          imageName: null,
        },
      })

      alert(`Member added successfully with WYC Number: ${newWycNumber}`)
    } catch (error: any) {
      console.error('Error adding member:', error)
      alert(
        `Error: ${error.message || 'Failed to add member. Please try again.'}`,
      )
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">WYC Members</h2>
      <button
        onClick={handleAddMember}
        className="mb-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90"
      >
        Add Member
      </button>
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
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left font-semibold text-sm border-b"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
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
