import { AddPrivilegeModal } from '@/components/privileges/AddPrivilegeModal'
import { columns } from '@/components/privileges/columns'
import type { PrivilegeTableMeta } from '@/components/privileges/columns'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { DataTable } from '@/components/ui/DataTable'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { PrivilegeFilters } from '@/domains/privileges/queries'
import {
  getPrivilegesQueryOptions,
  getPrivilegeTypesQueryOptions,
  useDeletePrivilegeMutation,
} from '@/domains/privileges/query-options'
import { requirePrivilegeForRoute } from '@/lib/route-guards'
import { cn } from '@/lib/utils'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { useState } from 'react'
import { z } from 'zod'

const ALL = '__all__'

const privilegeSearchSchema = z.object({
  privilegeType: z.number().optional(),
})

export const Route = createFileRoute('/privileges')({
  validateSearch: privilegeSearchSchema,
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/privileges')
  },
  loaderDeps: ({ search: { privilegeType } }) => {
    const filters: PrivilegeFilters = { privilegeType }
    return { filters }
  },
  loader: ({ context, deps: { filters } }) => {
    context.queryClient.ensureQueryData(getPrivilegeTypesQueryOptions())
    return context.queryClient.ensureQueryData(getPrivilegesQueryOptions(filters))
  },
  component: PrivilegesPage,
})

type DeleteTarget = {
  officerIndex: number
  roleName: string
  memberName: string
}

function PrivilegesPage() {
  const navigate = useNavigate({ from: '/privileges' })
  const { privilegeType } = Route.useSearch()
  const { filters } = Route.useLoaderDeps()

  const { data: privilegeTypes = [] } = useQuery(getPrivilegeTypesQueryOptions())
  const { data: members } = useSuspenseQuery(getPrivilegesQueryOptions(filters))

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const deleteMutation = useDeletePrivilegeMutation()

  const tableMeta: PrivilegeTableMeta = {
    onDeleteClick: (officerIndex, roleName, memberName) => {
      setDeleteTarget({ officerIndex, roleName, memberName })
    },
  }

  const table = useReactTable({
    data: members,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: tableMeta,
  })

  const hasFilters = privilegeType !== undefined

  const activeClass = 'bg-primary/10 border-primary'
  const inactiveClass = 'bg-background border-border'

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Privileges</h2>

      <Button onClick={() => setIsAddModalOpen(true)} className="mb-4">
        <Plus className="h-4 w-4" />
        New Privilege
      </Button>

      <div className="mb-4 p-4 border-2 rounded-lg bg-muted/50">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <Label className="mb-1">Role</Label>
            <Select
              value={privilegeType !== undefined ? String(privilegeType) : ALL}
              onValueChange={(value) =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    privilegeType: value === ALL ? undefined : Number(value),
                  }),
                  replace: true,
                })
              }
            >
              <SelectTrigger
                className={cn(
                  'border-2',
                  privilegeType !== undefined ? activeClass : inactiveClass,
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Roles</SelectItem>
                {privilegeTypes.map((pt) => (
                  <SelectItem key={pt.index} value={String(pt.index)}>
                    {pt.name || `Position ${pt.index}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasFilters && (
            <Button
              variant="destructive"
              onClick={() =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    privilegeType: undefined,
                  }),
                  replace: true,
                })
              }
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-2">{members.length} members</p>
      <DataTable table={table} />

      {isAddModalOpen && (
        <AddPrivilegeModal onClose={() => setIsAddModalOpen(false)} onSuccess={() => {}} />
      )}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Privilege</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{deleteTarget?.roleName}</strong> from{' '}
              <strong>{deleteTarget?.memberName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteTarget) return
                deleteMutation.mutate(
                  { data: { officerIndex: deleteTarget.officerIndex } },
                  { onSettled: () => setDeleteTarget(null) },
                )
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
