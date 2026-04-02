import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Link } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { AlertTriangle } from 'lucide-react'
import type { PrivilegeTableRow } from '@/domains/privileges/schema'

export type PrivilegeTableMeta = {
  onDeleteClick: (officerIndex: number, roleName: string, memberName: string) => void
}

const columnHelper = createColumnHelper<PrivilegeTableRow>()

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
    id: 'roles',
    header: 'Roles',
    cell: ({ row, table }) => {
      const roles = row.original.roles
      const memberName = row.original.memberName
      const meta = table.options.meta as PrivilegeTableMeta | undefined

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
  columnHelper.accessor('outToSea', {
    header: '',
    cell: (info) =>
      info.getValue() ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </TooltipTrigger>
          <TooltipContent>This user is out to sea</TooltipContent>
        </Tooltip>
      ) : null,
    enableSorting: false,
  }),
]
