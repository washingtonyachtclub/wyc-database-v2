import { createColumnHelper } from '@tanstack/react-table'
import { X } from 'lucide-react'
import type { Quarter } from '@/domains/quarters/schema'

export type QuarterTableMeta = {
  onDeleteClick: (index: number, text: string) => void
}

const columnHelper = createColumnHelper<Quarter>()

export const columns = [
  columnHelper.accessor('index', {
    header: 'Index',
    cell: (info) => info.getValue(),
    enableSorting: false,
  }),
  columnHelper.accessor('text', {
    header: 'Text',
    cell: (info) => info.getValue() || '—',
    enableSorting: false,
  }),
  columnHelper.accessor('school', {
    header: 'School',
    cell: (info) => info.getValue() || '—',
    enableSorting: false,
  }),
  columnHelper.accessor('endDate', {
    header: 'End Date',
    cell: (info) => info.getValue() || '—',
    enableSorting: false,
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row, table }) => {
      const meta = table.options.meta as QuarterTableMeta | undefined
      return (
        <button
          className="text-muted-foreground hover:text-destructive"
          onClick={() => meta?.onDeleteClick(row.original.index, row.original.text)}
        >
          <X className="h-4 w-4" />
        </button>
      )
    },
    enableSorting: false,
  }),
]
