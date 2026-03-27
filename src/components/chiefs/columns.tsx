import { Link } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import type { ChiefTableRow } from 'src/db/types'

const columnHelper = createColumnHelper<ChiefTableRow>()

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
  columnHelper.accessor('chiefTypes', {
    header: 'Chief Types',
    cell: (info) => info.getValue() || '—',
    enableSorting: false,
  }),
]
