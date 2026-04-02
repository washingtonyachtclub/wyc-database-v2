import { AddClassTypeModal } from '@/components/class-types/AddClassTypeModal'
import { columns } from '@/components/class-types/columns'
import type { ClassTypeTableMeta } from '@/components/class-types/columns'
import { DeleteConfirmDialog } from '@/components/ui/DeleteConfirmDialog'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/DataTable'
import {
  getClassTypesQueryOptions,
  useDeleteClassTypeMutation,
} from '@/domains/class-types/query-options'
import { requirePrivilegeForRoute } from '@/lib/route-guards'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/class-types')({
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/class-types')
  },
  loader: ({ context }) => {
    return context.queryClient.ensureQueryData(getClassTypesQueryOptions())
  },
  component: ClassTypesPage,
})

type DeleteTarget = {
  index: number
  text: string
}

function ClassTypesPage() {
  const { data: classTypes } = useSuspenseQuery(getClassTypesQueryOptions())
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const deleteMutation = useDeleteClassTypeMutation()

  const tableMeta: ClassTypeTableMeta = {
    onDeleteClick: (index, text) => {
      setDeleteTarget({ index, text })
    },
  }

  const table = useReactTable({
    data: classTypes,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: tableMeta,
  })

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Lesson Types</h2>

      <Button onClick={() => setIsAddModalOpen(true)} className="mb-4">
        <Plus className="h-4 w-4" />
        New Lesson Type
      </Button>

      <p className="text-sm text-muted-foreground mb-2">{classTypes.length} lesson types</p>
      <DataTable table={table} />

      {isAddModalOpen && (
        <AddClassTypeModal
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
              Deleting <strong>{deleteTarget?.text}</strong> from the database is almost always the wrong thing to do.
            </p>
            <p className="mb-2">
              If any lessons use this lesson type, those lessons will lose their type reference.
              This could affect lesson records, signups, and historical data.
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
