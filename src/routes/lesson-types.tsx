import { AddLessonTypeModal } from '@/components/lesson-types/AddLessonTypeModal'
import { columns } from '@/components/lesson-types/columns'
import type { LessonTypeTableMeta } from '@/components/lesson-types/columns'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/DataTable'
import {
  getLessonTypesQueryOptions,
  useDeleteLessonTypeMutation,
} from '@/domains/lesson-types/query-options'
import { requirePrivilegeForRoute } from '@/lib/route-guards'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/lesson-types')({
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/lesson-types')
  },
  loader: ({ context }) => {
    return context.queryClient.ensureQueryData(getLessonTypesQueryOptions())
  },
  component: LessonTypesPage,
})

type DeleteTarget = {
  index: number
  text: string
}

function LessonTypesPage() {
  const { data: lessonTypes } = useSuspenseQuery(getLessonTypesQueryOptions())
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const deleteMutation = useDeleteLessonTypeMutation()

  const tableMeta: LessonTypeTableMeta = {
    onDeleteClick: (index, text) => {
      setDeleteTarget({ index, text })
    },
  }

  const table = useReactTable({
    data: lessonTypes,
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

      <p className="text-sm text-muted-foreground mb-2">{lessonTypes.length} lesson types</p>
      <DataTable table={table} />

      {isAddModalOpen && (
        <AddLessonTypeModal onClose={() => setIsAddModalOpen(false)} onSuccess={() => {}} />
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
        title="Delete lesson type?"
        confirmLabels={[]}
        description={
          <p>
            Delete <strong>{deleteTarget?.text}</strong>? No lessons use it, so this is safe to
            remove.
          </p>
        }
      />
    </div>
  )
}
