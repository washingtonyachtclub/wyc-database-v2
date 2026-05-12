import { AddExaminerModal } from '@/components/examiners/AddExaminerModal'
import { columns } from '@/components/examiners/columns'
import type { ExaminerTableMeta } from '@/components/examiners/columns'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Plus } from 'lucide-react'
import { DataTable } from '@/components/ui/DataTable'
import { Label } from '@/components/ui/label'
import type { ExaminerFilters } from '@/domains/examiners/queries'
import {
  getExaminerQueryOptions,
  useDeactivateExaminerMutation,
} from '@/domains/examiners/query-options'
import { requirePrivilegeForRoute } from '@/lib/route-guards'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { useState } from 'react'
import { z } from 'zod'

const examinerSearchSchema = z.object({
  showInactive: z.boolean().catch(false),
})

export const Route = createFileRoute('/ratings-examiners')({
  validateSearch: examinerSearchSchema,
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/ratings-examiners')
  },
  loaderDeps: ({ search: { showInactive } }) => {
    const filters: ExaminerFilters = { showInactive }
    return { filters }
  },
  loader: ({ context, deps: { filters } }) => {
    return context.queryClient.ensureQueryData(getExaminerQueryOptions(filters))
  },
  component: RatingsExaminersPage,
})

type DeactivateTarget = {
  officerIndex: number
  memberName: string
}

function RatingsExaminersPage() {
  const navigate = useNavigate({ from: '/ratings-examiners' })
  const { showInactive } = Route.useSearch()
  const { filters } = Route.useLoaderDeps()

  const { data: examiners } = useSuspenseQuery(getExaminerQueryOptions(filters))

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState<DeactivateTarget | null>(null)
  const deactivateMutation = useDeactivateExaminerMutation()

  const tableMeta: ExaminerTableMeta = {
    onDeactivateClick: (officerIndex, memberName) => {
      setDeactivateTarget({ officerIndex, memberName })
    },
  }

  const table = useReactTable({
    data: examiners,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: tableMeta,
  })

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Ratings Examiners</h2>

      <Button onClick={() => setIsAddModalOpen(true)} className="mb-4">
        <Plus className="h-4 w-4" />
        New Ratings Examiner
      </Button>

      <div className="mb-4 p-4 border-2 rounded-lg bg-muted/50">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 pb-1">
            <Checkbox
              id="show-inactive"
              checked={showInactive}
              onCheckedChange={(checked) =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    showInactive: checked === true,
                  }),
                  replace: true,
                  resetScroll: false,
                })
              }
            />
            <Label htmlFor="show-inactive">Show Inactive</Label>
          </div>

          {showInactive && (
            <Button
              variant="destructive"
              onClick={() =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    showInactive: false,
                  }),
                  replace: true,
                  resetScroll: false,
                })
              }
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-2">{examiners.length} examiners</p>
      <DataTable table={table} />

      {isAddModalOpen && (
        <AddExaminerModal onClose={() => setIsAddModalOpen(false)} onSuccess={() => {}} />
      )}

      <AlertDialog
        open={deactivateTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Ratings Examiner</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <strong>{deactivateTarget?.memberName}</strong> as
              a ratings examiner?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deactivateTarget) return
                deactivateMutation.mutate(
                  { data: { officerIndex: deactivateTarget.officerIndex } },
                  { onSettled: () => setDeactivateTarget(null) },
                )
              }}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
