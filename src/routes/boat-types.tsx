import { useMemo, useState } from 'react'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { AddBoatTypeModal } from '@/components/boat-types/AddBoatTypeModal'
import { columns } from '@/components/boat-types/columns'
import type { BoatTypeDraft, BoatTypeTableMeta } from '@/components/boat-types/columns'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable } from '@/components/ui/DataTable'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Label } from '@/components/ui/label'
import { activeStatusRowClassName } from '@/components/ui/ActiveStatus'
import {
  getBoatTypesAllQueryOptions,
  getDistinctFleetNamesQueryOptions,
  useDeleteBoatTypeMutation,
  useSetBoatTypeActiveMutation,
  useUpdateBoatTypeMutation,
} from '@/domains/boat-types/query-options'
import { boatTypeInsertSchema, type BoatType } from '@/domains/boat-types/schema'
import { requirePrivilegeForRoute } from '@/lib/route-guards'
import { cn } from '@/lib/utils'

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

const EMPTY_DRAFT: BoatTypeDraft = { type: '', fleet: '', description: '' }

function BoatTypesPage() {
  const { data: allBoatTypes } = useSuspenseQuery(getBoatTypesAllQueryOptions())
  const { data: existingFleets = [] } = useQuery(getDistinctFleetNamesQueryOptions())
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState<BoatTypeDraft>(EMPTY_DRAFT)
  const deleteMutation = useDeleteBoatTypeMutation()
  const activeMutation = useSetBoatTypeActiveMutation()
  const updateMutation = useUpdateBoatTypeMutation({
    onSuccess: () => {
      setEditingIndex(null)
      setDraft(EMPTY_DRAFT)
    },
  })

  const boatTypes = useMemo(
    () => (showInactive ? allBoatTypes : allBoatTypes.filter((boatType) => boatType.active)),
    [allBoatTypes, showInactive],
  )

  const tableMeta: BoatTypeTableMeta = {
    editingIndex,
    draft,
    existingFleets,
    isSaving: updateMutation.isPending,
    isToggling: activeMutation.isPending,
    canSave: boatTypeInsertSchema.safeParse(draft).success,
    onEditClick: (boatType: BoatType) => {
      updateMutation.reset()
      setEditingIndex(boatType.index)
      setDraft({
        type: boatType.type,
        fleet: boatType.fleet,
        description: boatType.description,
      })
    },
    onDraftChange: (field, value) => setDraft((previous) => ({ ...previous, [field]: value })),
    onSave: () => {
      if (editingIndex === null) return
      updateMutation.mutate({ data: { index: editingIndex, ...draft } })
    },
    onCancel: () => {
      setEditingIndex(null)
      setDraft(EMPTY_DRAFT)
      updateMutation.reset()
    },
    onToggleActive: (index, currentlyActive) => {
      activeMutation.mutate({ data: { index, active: !currentlyActive } })
    },
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

      <div className="mb-4 flex items-center gap-4">
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4" />
          New Boat Type
        </Button>

        <div className="flex items-center gap-2">
          <Checkbox
            id="show-inactive"
            checked={showInactive}
            onCheckedChange={(checked) => {
              setShowInactive(checked === true)
              setEditingIndex(null)
              setDraft(EMPTY_DRAFT)
              updateMutation.reset()
            }}
          />
          <Label htmlFor="show-inactive" className="cursor-pointer">
            Show inactive
          </Label>
        </div>
      </div>

      <ErrorAlert
        error={updateMutation.error?.message ?? activeMutation.error?.message}
        action="Updating boat type"
      />
      <p className="mb-2 mt-2 text-sm text-muted-foreground">
        {showInactive ? `${boatTypes.length} boat types` : `${boatTypes.length} active boat types`}
      </p>
      <DataTable
        table={table}
        rowClassName={(row) => cn('group', activeStatusRowClassName(row.original.active))}
      />

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
        title="Delete boat type?"
        confirmLabels={[]}
        description={
          <p>
            Delete boat type <strong>{deleteTarget?.type}</strong>? No checkouts reference it, so
            this is safe to remove.
          </p>
        }
      />
    </div>
  )
}
