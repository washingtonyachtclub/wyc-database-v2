import { createColumnHelper } from '@tanstack/react-table'
import { X } from 'lucide-react'
import type { ClassType } from '@/domains/class-types/schema'

export type ClassTypeTableMeta = {
  onDeleteClick: (index: number, text: string) => void
}

const columnHelper = createColumnHelper<ClassType>()

export const columns = [
  columnHelper.accessor('text', {
    header: 'Lesson Type',
    cell: (info) => info.getValue() || '—',
    enableSorting: false,
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row, table }) => {
      const meta = table.options.meta as ClassTypeTableMeta | undefined
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
