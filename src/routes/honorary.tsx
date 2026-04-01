import { AddHonoraryModal } from '@/components/honorary/AddHonoraryModal'
import { columns } from '@/components/honorary/columns'
import type { HonoraryTableMeta } from '@/components/honorary/columns'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Plus } from 'lucide-react'
import { DataTable } from '@/components/ui/DataTable'
import { Label } from '@/components/ui/label'
import type { HonoraryFilters } from '@/db/honorary-queries'
import { getHonoraryQueryOptions, useDeleteHonoraryMutation } from '@/lib/honorary-query-options'
import { requirePrivilegeForRoute } from '@/lib/route-guards'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { useState } from 'react'
import { z } from 'zod'

const honorarySearchSchema = z.object({
  showOutToSea: z.boolean().catch(false),
})

export const Route = createFileRoute('/honorary')({
  validateSearch: honorarySearchSchema,
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/honorary')
  },
  loaderDeps: ({ search: { showOutToSea } }) => {
    const filters: HonoraryFilters = { showOutToSea }
    return { filters }
  },
  loader: ({ context, deps: { filters } }) => {
    return context.queryClient.ensureQueryData(getHonoraryQueryOptions(filters))
  },
  component: HonoraryPage,
})

type DeleteTarget = {
  officerIndex: number
  memberName: string
}

function HonoraryPage() {
  const navigate = useNavigate({ from: '/honorary' })
  const { showOutToSea } = Route.useSearch()
  const { filters } = Route.useLoaderDeps()

  const { data: members } = useSuspenseQuery(getHonoraryQueryOptions(filters))

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const deleteMutation = useDeleteHonoraryMutation()

  const tableMeta: HonoraryTableMeta = {
    onDeleteClick: (officerIndex, memberName) => {
      setDeleteTarget({ officerIndex, memberName })
    },
  }

  const table = useReactTable({
    data: members,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: tableMeta,
  })

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Honorary Members</h2>

      <Button onClick={() => setIsAddModalOpen(true)} className="mb-4">
        <Plus className="h-4 w-4" />
        New Honorary Member
      </Button>

      <div className="mb-4 p-4 border-2 rounded-lg bg-muted/50">
        <div className="flex flex-wrap items-end gap-4">
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

          {showOutToSea && (
            <Button
              variant="destructive"
              onClick={() =>
                navigate({
                  search: (prev) => ({
                    ...prev,
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

      <p className="text-sm text-muted-foreground mb-2">{members.length} members</p>
      <DataTable table={table} />

      {isAddModalOpen && (
        <AddHonoraryModal
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {}}
        />
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Honorary Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{deleteTarget?.memberName}</strong> from honorary members? This action cannot be undone.
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
