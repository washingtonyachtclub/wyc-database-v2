import { Link } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { X } from 'lucide-react'
import type { ExaminerTableRow } from '@/domains/examiners/schema'

export type ExaminerTableMeta = {
  onDeactivateClick: (officerIndex: number, memberName: string) => void
}

const columnHelper = createColumnHelper<ExaminerTableRow>()

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
  columnHelper.accessor('skipperRatings', {
    header: 'Skipper Ratings Held',
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
      const meta = table.options.meta as ExaminerTableMeta | undefined
      if (!row.original.active) return null
      return (
        <button
          className="text-muted-foreground hover:text-destructive"
          onClick={() =>
            meta?.onDeactivateClick(row.original.officerIndex, row.original.memberName)
          }
        >
          <X className="h-4 w-4" />
        </button>
      )
    },
    enableSorting: false,
  }),
]
