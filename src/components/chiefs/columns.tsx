import { Link } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import type { ChiefTableRow } from '@/domains/chiefs/schema'

export type ChiefTableMeta = {
  onDeleteClick: (officerIndex: number, roleName: string, memberName: string) => void
}

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
  columnHelper.display({
    id: 'chiefRoles',
    header: 'Chief Types',
    cell: ({ row, table }) => {
      const roles = row.original.chiefRoles
      const memberName = row.original.memberName
      const meta = table.options.meta as ChiefTableMeta | undefined

      if (!roles.length) return '—'

      return (
        <span>
          {roles.map((role, i) => (
            <span key={role.officerIndex}>
              <span
                className="cursor-pointer hover:text-destructive hover:underline"
                onClick={() => meta?.onDeleteClick(role.officerIndex, role.name, memberName)}
              >
                {role.name}
              </span>
              {i < roles.length - 1 && ', '}
            </span>
          ))}
        </span>
      )
    },
    enableSorting: false,
  }),
]
