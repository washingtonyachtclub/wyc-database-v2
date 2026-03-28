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
import { Plus } from 'lucide-react'
import { DataTable } from '@/components/ui/DataTable'
import { getHonoraryQueryOptions, useDeleteHonoraryMutation } from '@/lib/honorary-query-options'
import { requirePrivilegeForRoute } from '@/lib/route-guards'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { useState } from 'react'

export const Route = createFileRoute('/honorary')({
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/honorary')
  },
  loader: ({ context }) => {
    return context.queryClient.ensureQueryData(getHonoraryQueryOptions())
  },
  component: HonoraryPage,
})

type DeleteTarget = {
  officerIndex: number
  memberName: string
}

function HonoraryPage() {
  const { data: members } = useSuspenseQuery(getHonoraryQueryOptions())

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
