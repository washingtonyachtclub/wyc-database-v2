import { Link } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import type { CheckoutTableRow } from '@/domains/checkouts/schema'

const columnHelper = createColumnHelper<CheckoutTableRow>()

function formatDatetime(value: string) {
  if (!value) return ''
  return value.replace('T', ' ').slice(0, 16)
}

export const columns = [
  columnHelper.accessor('index', {
    header: '#',
    enableSorting: true,
  }),
  columnHelper.accessor('memberName', {
    header: 'Member',
    enableSorting: true,
    cell: (info) => (
      <Link
        to="/members/$wycNumber"
        params={{ wycNumber: String(info.row.original.wycNumber) }}
        className="underline"
      >
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor('boatName', {
    header: 'Boat',
    enableSorting: true,
  }),
  columnHelper.accessor('timeDeparture', {
    header: 'Departure',
    enableSorting: true,
    cell: (info) => formatDatetime(info.getValue()),
  }),
  columnHelper.accessor('expectedReturn', {
    header: 'Expected Return',
    enableSorting: true,
    cell: (info) => formatDatetime(info.getValue()),
  }),
  columnHelper.accessor('timeReturn', {
    header: 'Check-in',
    enableSorting: true,
    cell: (info) => formatDatetime(info.getValue()),
  }),
  columnHelper.accessor('ratingName', {
    header: 'Rating',
    enableSorting: true,
  }),
]
