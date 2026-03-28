import { Link } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { X } from 'lucide-react'
import type { HonoraryTableRow } from 'src/db/honorary-schema'

export type HonoraryTableMeta = {
  onDeleteClick: (officerIndex: number, memberName: string) => void
}

const columnHelper = createColumnHelper<HonoraryTableRow>()

export const columns = [
  columnHelper.accessor('wycNumber', {
    header: 'WYC ID',
    cell: (info) => (
      <Link
        to="/members/$wycNumber"
        params={{ wycNumber: String(info.getValue()) }}
        className="underline"
      >
        {info.getValue()}
      </Link>
    ),
    enableSorting: false,
  }),
  columnHelper.accessor('memberName', {
    header: 'Name',
    cell: (info) => info.getValue() || '—',
    enableSorting: false,
  }),
  columnHelper.accessor('expireQtr', {
    header: 'Expire Quarter',
    cell: (info) => info.getValue() || '—',
    enableSorting: false,
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row, table }) => {
      const meta = table.options.meta as HonoraryTableMeta | undefined
      return (
        <button
          className="text-muted-foreground hover:text-destructive"
          onClick={() => meta?.onDeleteClick(row.original.officerIndex, row.original.memberName)}
        >
          <X className="h-4 w-4" />
        </button>
      )
    },
    enableSorting: false,
  }),
]
