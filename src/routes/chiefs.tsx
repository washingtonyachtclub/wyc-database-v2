import { AddChiefModal } from '@/components/chiefs/AddChiefModal'
import { columns } from '@/components/chiefs/columns'
import type { ChiefTableMeta } from '@/components/chiefs/columns'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable } from '@/components/ui/DataTable'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ChiefFilters } from '@/domains/chiefs/queries'
import { getChiefsQueryOptions, getChiefTypesQueryOptions, useDeleteChiefMutation } from '@/domains/chiefs/query-options'
import { requirePrivilegeForRoute } from '@/lib/route-guards'
import { cn } from '@/lib/utils'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { useState } from 'react'
import { z } from 'zod'

const ALL = '__all__'

const chiefSearchSchema = z.object({
  chiefType: z.number().optional(),
  showOutToSea: z.boolean().catch(false),
})

export const Route = createFileRoute('/chiefs')({
  validateSearch: chiefSearchSchema,
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/chiefs')
  },
  loaderDeps: ({ search: { chiefType, showOutToSea } }) => {
    const filters: ChiefFilters = { chiefType, showOutToSea }
    return { filters }
  },
  loader: ({ context, deps: { filters } }) => {
    context.queryClient.ensureQueryData(getChiefTypesQueryOptions())
    return context.queryClient.ensureQueryData(getChiefsQueryOptions(filters))
  },
  component: ChiefsPage,
})

type DeleteTarget = {
  officerIndex: number
  roleName: string
  memberName: string
}

function ChiefsPage() {
  const navigate = useNavigate({ from: '/chiefs' })
  const { chiefType, showOutToSea } = Route.useSearch()
  const { filters } = Route.useLoaderDeps()

  const { data: chiefTypes = [] } = useQuery(getChiefTypesQueryOptions())
  const { data: chiefs } = useSuspenseQuery(getChiefsQueryOptions(filters))

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const deleteMutation = useDeleteChiefMutation()

  const tableMeta: ChiefTableMeta = {
    onDeleteClick: (officerIndex, roleName, memberName) => {
      setDeleteTarget({ officerIndex, roleName, memberName })
    },
  }

  const table = useReactTable({
    data: chiefs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: tableMeta,
  })

  const hasFilters = chiefType !== undefined || showOutToSea

  const activeClass = 'bg-primary/10 border-primary'
  const inactiveClass = 'bg-background border-border'

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Chiefs</h2>

      <Button onClick={() => setIsAddModalOpen(true)} className="mb-4">
        <Plus className="h-4 w-4" />
        New Chief
      </Button>

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

      <p className="text-sm text-muted-foreground mb-2">{chiefs.length} chiefs</p>
      <DataTable table={table} />

      {isAddModalOpen && (
        <AddChiefModal
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {}}
        />
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Chief Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{deleteTarget?.roleName}</strong> from{' '}
              <strong>{deleteTarget?.memberName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteTarget) return
                deleteMutation.mutate(
                  { data: { officerIndex: deleteTarget.officerIndex } },
                  { onSettled: () => setDeleteTarget(null) },
                )
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
