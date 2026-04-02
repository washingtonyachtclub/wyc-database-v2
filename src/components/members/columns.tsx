import { Link } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import type { MemberTableRow } from '@/domains/members/schema'

const columnHelper = createColumnHelper<MemberTableRow>()

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
  columnHelper.accessor((row) => `${row.first || ''} ${row.last || ''}`.trim(), {
    id: 'name',
    header: 'Name',
    cell: (info) => info.getValue() || '—',
    enableSorting: false,
  }),
  columnHelper.accessor('category', {
    header: 'Category',
    cell: (info) => info.getValue(),
    enableSorting: false,
  }),
  columnHelper.accessor('expireQtrSchoolText', {
    header: 'Expire Qtr',
    cell: (info) => {
      const value = info.getValue()
      const index = info.row.original.expireQtrIndex
      return `${value} (${index})`
    },
    enableSorting: true,
  }),
  columnHelper.accessor('joinDate', {
    header: 'Join Date (M/D/YYYY)',
    cell: (info) => {
      const date = info.getValue()
      return date ? new Date(date).toLocaleDateString() : '—'
    },
    enableSorting: true,
  }),
]
