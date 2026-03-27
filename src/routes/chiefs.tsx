import { columns } from '@/components/chiefs/columns'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable } from '@/components/ui/DataTable'
import { Label } from '@/components/ui/label'
import { PaginationControls } from '@/components/members/PaginationControls'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ChiefFilters } from '@/db/chief-queries'
import { getChiefsQueryOptions, getChiefTypesQueryOptions } from '@/lib/chiefs-query-options'
import { requirePrivilegeForRoute } from '@/lib/route-guards'
import { cn } from '@/lib/utils'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { z } from 'zod'

const ALL = '__all__'

const chiefSearchSchema = z.object({
  pageIndex: z.number().catch(0),
  pageSize: z.number().catch(10),
  chiefType: z.number().optional(),
  showOutToSea: z.boolean().catch(false),
})

export const Route = createFileRoute('/chiefs')({
  validateSearch: chiefSearchSchema,
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/chiefs')
  },
  loaderDeps: ({ search: { pageIndex, pageSize, chiefType, showOutToSea } }) => {
    const filters: ChiefFilters = { chiefType, showOutToSea }
    return { pageIndex, pageSize, filters }
  },
  loader: ({ context, deps: { pageIndex, pageSize, filters } }) => {
    return context.queryClient.ensureQueryData(
      getChiefsQueryOptions(pageIndex, pageSize, filters),
    )
  },
  component: ChiefsPage,
})

function ChiefsPage() {
  const navigate = useNavigate({ from: '/chiefs' })
  const { chiefType, showOutToSea } = Route.useSearch()
  const { pageIndex, pageSize, filters } = Route.useLoaderDeps()

  const { data: chiefTypes = [] } = useQuery(getChiefTypesQueryOptions())
  const { data: chiefsResponse } = useSuspenseQuery(
    getChiefsQueryOptions(pageIndex, pageSize, filters),
  )

  const chiefs = chiefsResponse.data
  const totalCount = chiefsResponse.totalCount
  const pageCount = Math.ceil(totalCount / pageSize)

  const table = useReactTable({
    data: chiefs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualFiltering: true,
    pageCount,
    state: {
      pagination: { pageIndex, pageSize },
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
  })

  const hasFilters = chiefType !== undefined || showOutToSea

  const activeClass = 'bg-primary/10 border-primary'
  const inactiveClass = 'bg-background border-border'

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Chiefs</h2>

      <div className="mb-4 p-4 border-2 rounded-lg bg-muted/50">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <Label className="mb-1">Chief Type</Label>
            <Select
              value={chiefType !== undefined ? String(chiefType) : ALL}
              onValueChange={(value) =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    pageIndex: 0,
                    chiefType: value === ALL ? undefined : Number(value),
                  }),
                  replace: true,
                })
              }
            >
              <SelectTrigger
                className={cn(
                  'border-2',
                  chiefType !== undefined ? activeClass : inactiveClass,
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Chief Types</SelectItem>
                {chiefTypes.map((ct) => (
                  <SelectItem key={ct.index} value={String(ct.index)}>
                    {ct.name || `Position ${ct.index}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 pb-1">
            <Checkbox
              id="show-out-to-sea"
              checked={showOutToSea}
              onCheckedChange={(checked) =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    pageIndex: 0,
                    showOutToSea: checked === true,
                  }),
                  replace: true,
                })
              }
            />
            <Label htmlFor="show-out-to-sea">Show Out to Sea</Label>
          </div>

          {hasFilters && (
            <Button
              variant="destructive"
              onClick={() =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    pageIndex: 0,
                    chiefType: undefined,
                    showOutToSea: false,
                  }),
                  replace: true,
                })
              }
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      <PaginationControls table={table} pageCount={pageCount} totalCount={totalCount} />
      <DataTable table={table} />
      <PaginationControls table={table} pageCount={pageCount} totalCount={totalCount} />
    </div>
  )
}
