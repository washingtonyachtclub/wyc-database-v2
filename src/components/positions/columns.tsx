import { Button } from '@/components/ui/button'
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
    cell: (info) =>
      info.getValue() ? (
        <span className="text-sm">Active</span>
      ) : (
        <span className="text-sm text-muted-foreground">Inactive</span>
      ),
    enableSorting: false,
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row, table }) => {
      const meta = table.options.meta as PositionTableMeta | undefined
      const { index, name, active } = row.original
      return (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={meta?.isToggling}
            className={
              active
                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300'
                : undefined
            }
            onClick={() => meta?.onToggleActive(index, active)}
          >
            {active ? 'Mark Inactive' : 'Mark Active'}
          </Button>
          <button
            className="text-muted-foreground hover:text-destructive"
            onClick={() => meta?.onDeleteClick(index, name)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )
    },
    enableSorting: false,
  }),
]
