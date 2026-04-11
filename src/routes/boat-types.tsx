import { AddBoatTypeModal } from '@/components/boat-types/AddBoatTypeModal'
import { columns } from '@/components/boat-types/columns'
import type { BoatTypeTableMeta } from '@/components/boat-types/columns'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/DataTable'
import {
  getBoatTypesAllQueryOptions,
  getDistinctFleetNamesQueryOptions,
  useDeleteBoatTypeMutation,
} from '@/domains/boat-types/query-options'
import { requirePrivilegeForRoute } from '@/lib/route-guards'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/boat-types')({
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/boat-types')
  },
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(getDistinctFleetNamesQueryOptions())
    return context.queryClient.ensureQueryData(getBoatTypesAllQueryOptions())
  },
  component: BoatTypesPage,
})

type DeleteTarget = {
  index: number
  type: string
}

function BoatTypesPage() {
  const { data: boatTypes } = useSuspenseQuery(getBoatTypesAllQueryOptions())
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const deleteMutation = useDeleteBoatTypeMutation()

  const tableMeta: BoatTypeTableMeta = {
    onDeleteClick: (index, type) => {
      setDeleteTarget({ index, type })
    },
  }

  const table = useReactTable({
    data: boatTypes,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: tableMeta,
  })

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Boat Types</h2>

      <Button onClick={() => setIsAddModalOpen(true)} className="mb-4">
        <Plus className="h-4 w-4" />
        New Boat Type
      </Button>

      <p className="text-sm text-muted-foreground mb-2">{boatTypes.length} boat types</p>
      <DataTable table={table} />

      {isAddModalOpen && (
        <AddBoatTypeModal onClose={() => setIsAddModalOpen(false)} onSuccess={() => {}} />
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
              Deleting boat type <strong>{deleteTarget?.type}</strong> from the database is almost
              always the wrong thing to do.
            </p>
            <p className="mb-2">
              Deleting an item from the database denies the fact that the item ever existed. This
              could affect checkouts, historical data, and any other records that reference this
              boat type.
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
