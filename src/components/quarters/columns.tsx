import { createColumnHelper } from '@tanstack/react-table'
import { Check, Pencil, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { Quarter } from '@/domains/quarters/schema'

export type QuarterDraft = { text: string; school: string; endDate: string }

export type QuarterTableMeta = {
  editingIndex: number | null
  draft: QuarterDraft
  isSaving: boolean
  onEditClick: (quarter: Quarter) => void
  onDraftChange: (field: keyof QuarterDraft, value: string) => void
  onSave: () => void
  onCancel: () => void
  onDeleteClick: (index: number, text: string) => void
}

const columnHelper = createColumnHelper<Quarter>()

function editableCell(field: keyof QuarterDraft, inputType: 'text' | 'date') {
  return ({
    row,
    table,
  }: {
    row: { original: Quarter }
    table: { options: { meta?: unknown } }
  }) => {
    const meta = table.options.meta as QuarterTableMeta | undefined
    const isEditing = meta?.editingIndex === row.original.index
    if (meta && isEditing) {
      return (
        <Input
          type={inputType}
          value={meta.draft[field]}
          onChange={(e) => meta.onDraftChange(field, e.target.value)}
          className="h-8"
        />
      )
    }
    return row.original[field] || '—'
  }
}

export const columns = [
  columnHelper.accessor('index', {
    header: 'Index',
    cell: (info) => info.getValue(),
    enableSorting: false,
  }),
  columnHelper.accessor('text', {
    header: 'Text',
    cell: editableCell('text', 'text'),
    enableSorting: false,
  }),
  columnHelper.accessor('school', {
    header: 'School',
    cell: editableCell('school', 'text'),
    enableSorting: false,
  }),
  columnHelper.accessor('endDate', {
    header: 'End Date',
    cell: editableCell('endDate', 'date'),
    enableSorting: false,
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row, table }) => {
      const meta = table.options.meta as QuarterTableMeta | undefined
      if (!meta) return null
      const isEditing = meta.editingIndex === row.original.index

      if (isEditing) {
        return (
          <div className="flex items-center gap-2">
            <button
              className="text-muted-foreground hover:text-primary disabled:opacity-50"
              onClick={meta.onSave}
              disabled={meta.isSaving}
              aria-label="Save"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              className="text-muted-foreground hover:text-foreground disabled:opacity-50"
              onClick={meta.onCancel}
              disabled={meta.isSaving}
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      }

      const revealed =
        meta.editingIndex === null ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'
      return (
        <div className="flex items-center gap-2">
          <button
            className={`text-muted-foreground hover:text-primary focus:opacity-100 ${revealed}`}
            onClick={() => meta.onEditClick(row.original)}
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            className={`text-muted-foreground hover:text-destructive focus:opacity-100 ${revealed}`}
            onClick={() => meta.onDeleteClick(row.original.index, row.original.text)}
            aria-label="Delete"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )
    },
    enableSorting: false,
  }),
]
