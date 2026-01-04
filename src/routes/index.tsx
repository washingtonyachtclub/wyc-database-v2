import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { count, desc, eq, sql } from 'drizzle-orm'
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
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import db from '../db/index'
import { requireAuth } from '../lib/auth-middleware'
import { hashPassword } from '../lib/auth'
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

const getCategoriesQueryOptions = () =>
  queryOptions({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

const getQuartersQueryOptions = () =>
  queryOptions({
    queryKey: ['quarters'],
    queryFn: getQuarters,
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
    // Require authentication
    await requireAuth()

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

export const getCategories = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireAuth()
    const result = await db.select().from(memcat).orderBy(memcat.index)
    return result
  },
)

export const getQuarters = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireAuth()
    const result = await db
      .select()
      .from(quarters)
      .orderBy(desc(quarters.index))
    return result
  },
)

export const addMember = createServerFn({ method: 'POST' })
  .inputValidator((data: Member) => data)
  .handler(async ({ data }) => {
    // Require authentication
    await requireAuth()

    try {
      // Hash password before storing
      const hashedPassword = data.password
        ? hashPassword(data.password)
        : data.password

      const newMember = await db
        .insert(wycDatabase)
        .values({
          ...data,
          password: hashedPassword,
        })
        .$returningId()
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
  beforeLoad: ({ context }) => {
    // If not authenticated, redirect to login
    if (!context.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: (prev) => ({ ...prev, redirect: '/' }),
      })
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

// ===== ADD MEMBER FORM COMPONENT =====

function AddMemberForm({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const queryClient = useQueryClient()
  const { data: mostRecentNumber } = useQuery(
    getMostRecentWycNumberQueryOptions(),
  )
  const { data: categories = [] } = useQuery(getCategoriesQueryOptions())
  const { data: quartersData = [] } = useQuery(getQuartersQueryOptions())

  const addMemberMutation = useMutation({
    mutationFn: addMember,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['members'],
      })
      queryClient.invalidateQueries(getMostRecentWycNumberQueryOptions())
      onSuccess()
      onClose()
    },
  })

  const [formData, setFormData] = useState<Partial<Member>>({
    wycNumber: 1,
    category: undefined,
    expireQtr: undefined,
    outToSea: 0,
    joinDate: new Date().toISOString().slice(0, 16),
    password: '',
  })

  const [error, setError] = useState<string | null>(null)

  // Update WYC Number when mostRecentNumber changes
  useEffect(() => {
    if (isOpen && mostRecentNumber) {
      setFormData((prev) => ({
        ...prev,
        wycNumber: mostRecentNumber + 1,
      }))
    }
  }, [mostRecentNumber, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const memberData: Member = {
        wycNumber: formData.wycNumber!,
        first: formData.first || null,
        last: formData.last || null,
        streetAddress: formData.streetAddress || null,
        city: formData.city || null,
        state: formData.state || null,
        zipCode: formData.zipCode || null,
        phone1: formData.phone1 || null,
        phone2: formData.phone2 || null,
        email: formData.email || null,
        category: formData.category ?? null,
        expireQtr: formData.expireQtr ?? 0,
        studentId: formData.studentId ?? null,
        password: formData.password || null,
        outToSea: formData.outToSea ?? 0,
        joinDate: formData.joinDate
          ? new Date(formData.joinDate).toISOString()
          : new Date().toISOString(),
        imageName: formData.imageName || null,
      }

      await addMemberMutation.mutateAsync({ data: memberData })
    } catch (err: any) {
      setError(err.message || 'Failed to add member. Please try again.')
    }
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'wycNumber' ||
        name === 'category' ||
        name === 'expireQtr' ||
        name === 'studentId' ||
        name === 'outToSea'
          ? value === '' || value === 'null'
            ? null
            : Number(value)
          : value === ''
            ? null
            : value,
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Add New Member</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-4 border border-destructive">
              <div className="text-sm text-destructive">{error}</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="wycNumber"
                className="block text-sm font-medium mb-1"
              >
                WYC Number *
              </label>
              <input
                id="wycNumber"
                name="wycNumber"
                type="number"
                required
                value={formData.wycNumber ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label
                htmlFor="joinDate"
                className="block text-sm font-medium mb-1"
              >
                Join Date *
              </label>
              <input
                id="joinDate"
                name="joinDate"
                type="datetime-local"
                required
                value={formData.joinDate?.slice(0, 16) ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label htmlFor="first" className="block text-sm font-medium mb-1">
                First Name
              </label>
              <input
                id="first"
                name="first"
                type="text"
                maxLength={50}
                value={formData.first ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label htmlFor="last" className="block text-sm font-medium mb-1">
                Last Name
              </label>
              <input
                id="last"
                name="last"
                type="text"
                maxLength={50}
                value={formData.last ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                maxLength={50}
                value={formData.email ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label
                htmlFor="phone1"
                className="block text-sm font-medium mb-1"
              >
                Phone 1
              </label>
              <input
                id="phone1"
                name="phone1"
                type="text"
                maxLength={50}
                value={formData.phone1 ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label
                htmlFor="phone2"
                className="block text-sm font-medium mb-1"
              >
                Phone 2
              </label>
              <input
                id="phone2"
                name="phone2"
                type="text"
                maxLength={50}
                value={formData.phone2 ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                maxLength={50}
                value={formData.password ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div className="col-span-2">
              <label
                htmlFor="streetAddress"
                className="block text-sm font-medium mb-1"
              >
                Street Address
              </label>
              <input
                id="streetAddress"
                name="streetAddress"
                type="text"
                maxLength={100}
                value={formData.streetAddress ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium mb-1">
                City
              </label>
              <input
                id="city"
                name="city"
                type="text"
                maxLength={50}
                value={formData.city ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium mb-1">
                State
              </label>
              <input
                id="state"
                name="state"
                type="text"
                maxLength={20}
                value={formData.state ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label
                htmlFor="zipCode"
                className="block text-sm font-medium mb-1"
              >
                Zip Code
              </label>
              <input
                id="zipCode"
                name="zipCode"
                type="text"
                maxLength={10}
                value={formData.zipCode ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium mb-1"
              >
                Category
              </label>
              <select
                id="category"
                name="category"
                value={formData.category ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.index} value={cat.index}>
                    {cat.text || `Category ${cat.index}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="expireQtr"
                className="block text-sm font-medium mb-1"
              >
                Expire Quarter *
              </label>
              <select
                id="expireQtr"
                name="expireQtr"
                required
                value={formData.expireQtr ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">Select Quarter</option>
                {quartersData.map((qtr) => (
                  <option key={qtr.index} value={qtr.index}>
                    {qtr.school || qtr.text || `Quarter ${qtr.index}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="studentId"
                className="block text-sm font-medium mb-1"
              >
                Student ID
              </label>
              <input
                id="studentId"
                name="studentId"
                type="number"
                value={formData.studentId ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label
                htmlFor="outToSea"
                className="block text-sm font-medium mb-1"
              >
                Out to Sea
              </label>
              <select
                id="outToSea"
                name="outToSea"
                value={formData.outToSea ?? 0}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              >
                <option value={0}>No</option>
                <option value={1}>Yes</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="imageName"
                className="block text-sm font-medium mb-1"
              >
                Image Name
              </label>
              <input
                id="imageName"
                name="imageName"
                type="text"
                maxLength={50}
                value={formData.imageName ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-accent"
              disabled={addMemberMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50"
              disabled={addMemberMutation.isPending}
            >
              {addMemberMutation.isPending ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ===== COMPONENT =====

function App() {
  const navigate = useNavigate({ from: '/' })
  const { pageIndex, pageSize } = Route.useSearch()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)

  const { data: membersResponse } = useSuspenseQuery(
    getMembersQueryOptions(pageIndex, pageSize),
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

  const handleFormSuccess = () => {
    // Optionally show success message
    alert('Member added successfully!')
    // Reset form by changing key
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
