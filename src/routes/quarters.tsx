import { AddQuarterModal } from '@/components/quarters/AddQuarterModal'
import { columns } from '@/components/quarters/columns'
import type { QuarterTableMeta } from '@/components/quarters/columns'
import { DeleteConfirmDialog } from '@/components/ui/DeleteConfirmDialog'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/DataTable'
import {
  getQuartersQueryOptions,
  useDeleteQuarterMutation,
} from '@/domains/quarters/query-options'
import { requirePrivilegeForRoute } from '@/lib/route-guards'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/quarters')({
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/quarters')
  },
  loader: ({ context }) => {
    return context.queryClient.ensureQueryData(getQuartersQueryOptions())
  },
  component: QuartersPage,
})

type DeleteTarget = {
  index: number
  text: string
}

function QuartersPage() {
  const { data: quarters } = useSuspenseQuery(getQuartersQueryOptions())
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const deleteMutation = useDeleteQuarterMutation()

  const tableMeta: QuarterTableMeta = {
    onDeleteClick: (index, text) => {
      setDeleteTarget({ index, text })
    },
  }

  const table = useReactTable({
    data: quarters,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: tableMeta,
  })

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Quarters</h2>

      <Button onClick={() => setIsAddModalOpen(true)} className="mb-4">
        <Plus className="h-4 w-4" />
        New Quarter
      </Button>

      <p className="text-sm text-muted-foreground mb-2">{quarters.length} quarters</p>
      <DataTable table={table} />

      {isAddModalOpen && (
        <AddQuarterModal
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {}}
        />
      )}

      <DeleteConfirmDialog
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
              Deleting quarter <strong>{deleteTarget?.text}</strong> from the database is almost always the wrong thing to do.
            </p>
            <p className="mb-2">
              If any lessons or member records reference this quarter, those records will lose their quarter reference.
              This could affect lesson scheduling, member expiration tracking, and historical data.
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
