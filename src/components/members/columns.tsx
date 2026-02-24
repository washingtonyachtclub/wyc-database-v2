import { createColumnHelper } from '@tanstack/react-table'

export type MembersTableRow = {
  wycNumber: number
  first: string
  last: string
  category: string
  expireQtr: string
  expireQtrIndex: number
  joinDate: string
}

const columnHelper = createColumnHelper<MembersTableRow>()

export const columns = [
  columnHelper.accessor('wycNumber', {
    header: 'WYC ID',
    cell: (info) => info.getValue(),
    enableSorting: false,
  }),
  columnHelper.accessor(
    (row) => `${row.first || ''} ${row.last || ''}`.trim(),
    {
      id: 'name',
      header: 'Name',
      cell: (info) => info.getValue() || '—',
      enableSorting: false,
    },
  ),
  columnHelper.accessor('category', {
    header: 'Category',
    cell: (info) => info.getValue(),
    enableSorting: false,
  }),
  columnHelper.accessor('expireQtr', {
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
