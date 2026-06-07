import { AddQuarterModal } from '@/components/quarters/AddQuarterModal'
import { columns } from '@/components/quarters/columns'
import type { QuarterDraft, QuarterTableMeta } from '@/components/quarters/columns'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/DataTable'
import {
  getQuartersQueryOptions,
  useCreateQuarterMutation,
  useDeleteQuarterMutation,
  useUpdateQuarterMutation,
} from '@/domains/quarters/query-options'
import { nextQuarterFields } from '@/domains/quarters/rotation'
import type { Quarter } from '@/domains/quarters/schema'
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

const EMPTY_DRAFT: QuarterDraft = { text: '', school: '', endDate: '' }

function QuartersPage() {
  const { data: quarters } = useSuspenseQuery(getQuartersQueryOptions())
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState<QuarterDraft>(EMPTY_DRAFT)
  const deleteMutation = useDeleteQuarterMutation()
  const createMutation = useCreateQuarterMutation()
  const updateMutation = useUpdateQuarterMutation({
    onSuccess: () => {
      setEditingIndex(null)
      setDraft(EMPTY_DRAFT)
    },
  })

  const tableMeta: QuarterTableMeta = {
    editingIndex,
    draft,
    isSaving: updateMutation.isPending,
    onEditClick: (quarter: Quarter) => {
      setEditingIndex(quarter.index)
      setDraft({ text: quarter.text, school: quarter.school, endDate: quarter.endDate })
    },
    onDraftChange: (field, value) => setDraft((prev) => ({ ...prev, [field]: value })),
    onSave: () => {
      if (editingIndex === null) return
      updateMutation.mutate({ data: { index: editingIndex, ...draft } })
    },
    onCancel: () => {
      setEditingIndex(null)
      setDraft(EMPTY_DRAFT)
    },
    onDeleteClick: (index, text) => {
      setDeleteTarget({ index, text })
    },
  }

  // Quarters come back ordered by index descending, so the first row is the latest.
  const latest = quarters[0]
  const nextFields = latest ? nextQuarterFields(latest.school) : null

  const table = useReactTable({
    data: quarters,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: tableMeta,
  })

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Quarters</h2>

      <div className="mb-4 flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => {
            if (nextFields) createMutation.mutate({ data: { ...nextFields, endDate: '' } })
          }}
          disabled={!nextFields || createMutation.isPending}
          title={
            nextFields
              ? `Adds ${nextFields.school} (end date left blank)`
              : 'Could not determine the next quarter from the latest one'
          }
        >
          <Plus className="h-4 w-4" />
          {nextFields ? `Add ${nextFields.school}` : 'Add next quarter'}
        </Button>
        <Button variant="ghost" onClick={() => setIsAddModalOpen(true)}>
          New Quarter (manual)
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-2">{quarters.length} quarters</p>
      <DataTable table={table} rowClassName={() => 'group'} />

      {isAddModalOpen && (
        <AddQuarterModal onClose={() => setIsAddModalOpen(false)} onSuccess={() => {}} />
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
              Deleting quarter <strong>{deleteTarget?.text}</strong> from the database is almost
              always the wrong thing to do.
            </p>
            <p className="mb-2">
              If any lessons or member records reference this quarter, those records will lose their
              quarter reference. This could affect lesson scheduling, member expiration tracking,
              and historical data.
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
