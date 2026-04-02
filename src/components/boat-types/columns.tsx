import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { createColumnHelper } from '@tanstack/react-table'
import { X } from 'lucide-react'
import type { BoatType } from '@/domains/boat-types/schema'

export type BoatTypeTableMeta = {
  onDeleteClick: (index: number, type: string) => void
}

const columnHelper = createColumnHelper<BoatType>()

export const columns = [
  columnHelper.accessor('type', {
    header: 'Type',
    cell: (info) => info.getValue() || '—',
    enableSorting: false,
  }),
  columnHelper.accessor('fleet', {
    header: 'Fleet',
    cell: (info) => info.getValue() || '—',
    enableSorting: false,
  }),
  columnHelper.accessor('description', {
    header: 'Description',
    cell: (info) => {
      const val = info.getValue()
      if (!val) return '—'
      if (val.length <= 100) return val
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-default">{val.slice(0, 100)}…</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">{val}</TooltipContent>
        </Tooltip>
      )
    },
    enableSorting: false,
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row, table }) => {
      const meta = table.options.meta as BoatTypeTableMeta | undefined
      return (
        <button
          className="text-muted-foreground hover:text-destructive"
          onClick={() => meta?.onDeleteClick(row.original.index, row.original.type)}
        >
          <X className="h-4 w-4" />
        </button>
      )
    },
    enableSorting: false,
  }),
]
