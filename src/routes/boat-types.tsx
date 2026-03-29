import { AddBoatTypeModal } from '@/components/boat-types/AddBoatTypeModal'
import { columns } from '@/components/boat-types/columns'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/DataTable'
import {
  getBoatTypesAllQueryOptions,
  getDistinctFleetNamesQueryOptions,
} from '@/lib/boat-types-query-options'
import { requirePrivilegeForRoute } from '@/lib/route-guards'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/boat-types')({
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/boat-types')
  },
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(getDistinctFleetNamesQueryOptions())
    return context.queryClient.ensureQueryData(getBoatTypesAllQueryOptions())
  },
  component: BoatTypesPage,
})

function BoatTypesPage() {
  const { data: boatTypes } = useSuspenseQuery(getBoatTypesAllQueryOptions())
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const table = useReactTable({
    data: boatTypes,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Boat Types</h2>

      <Button onClick={() => setIsAddModalOpen(true)} className="mb-4">
        <Plus className="h-4 w-4" />
        New Boat Type
      </Button>

      <p className="text-sm text-muted-foreground mb-2">{boatTypes.length} boat types</p>
      <DataTable table={table} />

      {isAddModalOpen && (
        <AddBoatTypeModal
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {}}
        />
      )}
    </div>
  )
}
