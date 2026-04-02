import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { createColumnHelper } from '@tanstack/react-table'
import type { BoatType } from 'src/db/boat-type-schema'

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
]
