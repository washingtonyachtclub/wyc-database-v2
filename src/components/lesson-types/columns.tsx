import { createColumnHelper } from '@tanstack/react-table'
import { X } from 'lucide-react'
import type { LessonType } from '@/domains/lesson-types/schema'

export type LessonTypeTableMeta = {
  onDeleteClick: (index: number, text: string) => void
}

const columnHelper = createColumnHelper<LessonType>()

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
      const meta = table.options.meta as LessonTypeTableMeta | undefined
      if (row.original.usageCount > 0) return null
      return (
        <button
          className="text-muted-foreground hover:text-destructive"
          title="Delete"
          onClick={() => meta?.onDeleteClick(row.original.index, row.original.text)}
        >
          <X className="h-4 w-4" />
        </button>
      )
    },
    enableSorting: false,
  }),
]
