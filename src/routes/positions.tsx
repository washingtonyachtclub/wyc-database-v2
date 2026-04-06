import { AddPositionModal } from '@/components/positions/AddPositionModal'
import { columns } from '@/components/positions/columns'
import type { PositionTableMeta } from '@/components/positions/columns'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/DataTable'
import { Label } from '@/components/ui/label'
import {
  getPositionsAllQueryOptions,
  getPosTypesAllQueryOptions,
  useDeletePositionMutation,
  useSetPositionActiveMutation,
} from '@/domains/positions/query-options'
import { requirePrivilegeForRoute } from '@/lib/route-guards'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'

export const Route = createFileRoute('/positions')({
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/positions')
  },
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(getPosTypesAllQueryOptions())
    return context.queryClient.ensureQueryData(getPositionsAllQueryOptions())
  },
  component: PositionsPage,
})

type DeleteTarget = {
  index: number
  name: string
}

function PositionsPage() {
  const { data: allPositions } = useSuspenseQuery(getPositionsAllQueryOptions())
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const deleteMutation = useDeletePositionMutation()
  const activeMutation = useSetPositionActiveMutation()

  const filteredPositions = useMemo(
    () => (showInactive ? allPositions : allPositions.filter((p) => p.active)),
    [allPositions, showInactive],
  )

  const tableMeta: PositionTableMeta = {
    onToggleActive: (index, currentlyActive) => {
      activeMutation.mutate({ data: { index, active: !currentlyActive } })
    },
    onDeleteClick: (index, name) => {
      setDeleteTarget({ index, name })
    },
    isToggling: activeMutation.isPending,
  }

  const table = useReactTable({
    data: filteredPositions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: tableMeta,
  })

  const countLabel =
    showInactive && filteredPositions.length !== allPositions.length
      ? `${filteredPositions.length} of ${allPositions.length} positions`
      : `${filteredPositions.length} positions`

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Positions</h2>

      <div className="flex items-center gap-4 mb-4">
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4" />
          New Position
        </Button>

        <div className="flex items-center gap-2">
          <Checkbox
            id="show-inactive"
            checked={showInactive}
            onCheckedChange={(checked) => setShowInactive(checked === true)}
          />
          <Label htmlFor="show-inactive" className="cursor-pointer">
            Show inactive
          </Label>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-2">{countLabel}</p>
      <DataTable table={table} />

      {isAddModalOpen && (
        <AddPositionModal
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {}}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return
          deleteMutation.mutate(
            { data: { index: deleteTarget.index } },
            { onSettled: () => setDeleteTarget(null) },
          )
        }}
        title="ARE YOU SURE?"
        description={
          <>
            <p className="mb-2">
              Deleting position <strong>{deleteTarget?.name}</strong> from the database
              is almost always the wrong thing to do.
            </p>
            <p className="mb-2">
              Deleting a position denies the fact that it ever existed. This could affect
              officer records, privilege mappings, and any other data that references this
              position. Consider marking it inactive instead.
            </p>
            <p className="font-semibold">
              You should probably only do this if you just created it by mistake.
            </p>
          </>
        }
      />
    </div>
  )
}
