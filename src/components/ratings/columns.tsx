import { Link } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { AlertTriangle } from 'lucide-react'
import type { MemberRating } from 'src/db/member-schema'
import { getExpiryInfo } from 'src/lib/rating-expiry'

const columnHelper = createColumnHelper<MemberRating>()

export const columns = [
  columnHelper.accessor('index', {
    header: '#',
    enableSorting: false,
    cell: (info) => (
      <Link
        to="/ratings/$ratingIndex"
        params={{ ratingIndex: String(info.getValue()) }}
        className="underline"
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
        className="underline"
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
        className="underline"
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
  columnHelper.display({
    id: 'expiry',
    header: '',
    cell: ({ row }) => {
      const expiryInfo = getExpiryInfo(row.original)
      if (!expiryInfo || !expiryInfo.startsWith('Expired')) return null
      return (
        <span title={expiryInfo}>
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
        </span>
      )
    },
    size: 32,
  }),
]
