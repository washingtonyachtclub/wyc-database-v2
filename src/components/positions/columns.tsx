import { ActiveStatus, ActiveStatusButton } from '@/components/ui/ActiveStatus'
import type { Position } from '@/domains/positions/schema'
import { createColumnHelper } from '@tanstack/react-table'
import { X } from 'lucide-react'

export type PositionTableMeta = {
  onToggleActive: (index: number, currentlyActive: boolean) => void
  onDeleteClick: (index: number, name: string) => void
  isToggling: boolean
}

const columnHelper = createColumnHelper<Position>()

export const columns = [
  columnHelper.accessor('name', {
    header: 'Name',
    cell: (info) => info.getValue() || '—',
    enableSorting: false,
  }),
  columnHelper.accessor('typeName', {
    header: 'Type',
    cell: (info) => info.getValue() || '—',
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
      const meta = table.options.meta as PositionTableMeta | undefined
      const { index, name, active, usageCount } = row.original
      return (
        <div className="flex items-center justify-end gap-2">
          <ActiveStatusButton
            active={active}
            disabled={meta?.isToggling}
            onClick={() => meta?.onToggleActive(index, active)}
          />
          {usageCount === 0 && (
            <button
              className="text-muted-foreground hover:text-destructive"
              title="Delete"
              onClick={() => meta?.onDeleteClick(index, name)}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )
    },
    enableSorting: false,
  }),
]
