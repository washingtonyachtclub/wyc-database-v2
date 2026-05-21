import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Link } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { CircleHelp } from 'lucide-react'
import type { ChiefTableRow } from '@/domains/chiefs/schema'

export type ChiefTableMeta = {
  onDeleteClick: (officerIndex: number, roleName: string, memberName: string) => void
}

const columnHelper = createColumnHelper<ChiefTableRow>()

const wycIdColumn = columnHelper.accessor('wycNumber', {
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
})

const nameColumn = columnHelper.accessor('memberName', {
  header: 'Name',
  cell: (info) => info.getValue() || '—',
  enableSorting: false,
})

const adminRolesColumn = columnHelper.display({
  id: 'chiefRoles',
  header: () => (
    <span className="flex items-center gap-1">
      Chief Types
      <Tooltip>
        <TooltipTrigger asChild>
          <CircleHelp className="h-3.5 w-3.5 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent>Click on a chief type to remove it</TooltipContent>
      </Tooltip>
    </span>
  ),
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
})

const rolesColumn = columnHelper.display({
  id: 'chiefRoles',
  header: 'Chief Types',
  cell: ({ row }) => {
    const roles = row.original.chiefRoles
    if (!roles.length) return '—'
    return roles.map((r) => r.name).join(', ')
  },
  enableSorting: false,
})

export const adminColumns = [wycIdColumn, nameColumn, adminRolesColumn]
export const publicColumns = [nameColumn, rolesColumn]
