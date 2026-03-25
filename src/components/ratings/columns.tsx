import { Link } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import type { MemberRating } from 'src/db/types'

const columnHelper = createColumnHelper<MemberRating>()

export const columns = [
  columnHelper.accessor('index', {
    header: '#',
    enableSorting: false,
    cell: (info) => (
      <Link
        to="/ratings/$ratingIndex"
        params={{ ratingIndex: String(info.getValue()) }}
        className="text-primary underline"
      >
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor('ratingText', {
    header: 'Rating',
    enableSorting: true,
  }),
  columnHelper.accessor('date', {
    header: 'Date',
    enableSorting: true,
  }),
  columnHelper.accessor('memberName', {
    header: 'Member',
    enableSorting: true,
    cell: (info) => (
      <Link
        to="/members/$wycNumber"
        params={{ wycNumber: String(info.row.original.member) }}
        className="text-primary underline"
      >
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor('examinerName', {
    header: 'Examiner',
    enableSorting: true,
    cell: (info) => (
      <Link
        to="/members/$wycNumber"
        params={{ wycNumber: String(info.row.original.examiner) }}
        className="text-primary underline"
      >
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor('comments', {
    header: 'Comments',
    enableSorting: false,
    cell: (info) => (
      <span className="block max-w-xs truncate" title={info.getValue()}>
        {info.getValue()}
      </span>
    ),
  }),
]
