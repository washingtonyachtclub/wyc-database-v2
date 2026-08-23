import { createColumnHelper } from '@tanstack/react-table'
import { Check, Pencil, X } from 'lucide-react'
import { useLayoutEffect, useRef } from 'react'
import { FleetCombobox } from '@/components/boat-types/FleetCombobox'
import { ActiveStatus, ActiveStatusButton } from '@/components/ui/ActiveStatus'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { BoatType } from '@/domains/boat-types/schema'

export type BoatTypeDraft = {
  type: string
  fleet: string
  description: string
}

export type BoatTypeTableMeta = {
  editingIndex: number | null
  draft: BoatTypeDraft
  existingFleets: string[]
  isSaving: boolean
  isToggling: boolean
  canSave: boolean
  onEditClick: (boatType: BoatType) => void
  onDraftChange: (field: keyof BoatTypeDraft, value: string) => void
  onSave: () => void
  onCancel: () => void
  onToggleActive: (index: number, currentlyActive: boolean) => void
  onDeleteClick: (index: number, type: string) => void
}

const columnHelper = createColumnHelper<BoatType>()

function AutoResizeTextarea({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const textarea = ref.current
    if (!textarea) return
    textarea.style.height = '0px'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
  }, [value])

  return (
    <Textarea
      ref={ref}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-8 resize-none overflow-y-auto py-1.5"
    />
  )
}

export const columns = [
  columnHelper.accessor('type', {
    header: 'Type',
    cell: ({ row, table }) => {
      const meta = table.options.meta as BoatTypeTableMeta | undefined
      if (meta?.editingIndex === row.original.index) {
        return (
          <Input
            value={meta.draft.type}
            onChange={(event) => meta.onDraftChange('type', event.target.value)}
            className="h-8"
          />
        )
      }
      return row.original.type || '—'
    },
    enableSorting: false,
  }),
  columnHelper.accessor('fleet', {
    header: 'Fleet',
    cell: ({ row, table }) => {
      const meta = table.options.meta as BoatTypeTableMeta | undefined
      if (meta?.editingIndex === row.original.index) {
        return (
          <FleetCombobox
            value={meta.draft.fleet}
            onChange={(value) => meta.onDraftChange('fleet', value)}
            existingFleets={meta.existingFleets}
            triggerClassName="h-8"
          />
        )
      }
      return row.original.fleet || '—'
    },
    enableSorting: false,
  }),
  columnHelper.accessor('description', {
    header: 'Description',
    cell: ({ row, table }) => {
      const meta = table.options.meta as BoatTypeTableMeta | undefined
      if (meta?.editingIndex === row.original.index) {
        return (
          <AutoResizeTextarea
            value={meta.draft.description}
            onChange={(value) => meta.onDraftChange('description', value)}
          />
        )
      }

      const value = row.original.description
      if (!value) return '—'
      if (value.length <= 100) return value
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-default">{value.slice(0, 100)}…</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">{value}</TooltipContent>
        </Tooltip>
      )
    },
    enableSorting: false,
  }),
  columnHelper.accessor('active', {
    header: 'Status',
    cell: (info) => <ActiveStatus active={info.getValue()} />,
    enableSorting: false,
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row, table }) => {
      const meta = table.options.meta as BoatTypeTableMeta | undefined
      if (!meta) return null

      const { index, type, active, usageCount } = row.original
      const isEditing = meta.editingIndex === index
      if (isEditing) {
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={meta.onSave}
              disabled={meta.isSaving || !meta.canSave}
              aria-label="Save"
            >
              <Check />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={meta.onCancel}
              disabled={meta.isSaving}
              aria-label="Cancel"
            >
              <X />
            </Button>
          </div>
        )
      }

      const revealed =
        meta.editingIndex === null ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'
      return (
        <div className="flex items-center justify-end gap-1">
          <ActiveStatusButton
            active={active}
            disabled={meta.isToggling || meta.editingIndex !== null}
            onClick={() => meta.onToggleActive(index, active)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`h-8 w-8 text-muted-foreground hover:text-primary focus:opacity-100 ${revealed}`}
            onClick={() => meta.onEditClick(row.original)}
            aria-label="Edit"
          >
            <Pencil />
          </Button>
          {usageCount === 0 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={`h-8 w-8 text-muted-foreground hover:text-destructive focus:opacity-100 ${revealed}`}
              onClick={() => meta.onDeleteClick(index, type)}
              aria-label="Delete"
            >
              <X />
            </Button>
          )}
          {usageCount > 0 && <span className="h-8 w-8 shrink-0" aria-hidden="true" />}
        </div>
      )
    },
    enableSorting: false,
  }),
]
