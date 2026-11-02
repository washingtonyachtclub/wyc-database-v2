import { AddOfficerModal } from '@/components/officers/AddOfficerModal'
import { OfficersOrgChart } from '@/components/officers/OfficersOrgChart'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import {
  getOfficerPagePositionsQueryOptions,
  getOfficerPageQueryOptions,
  useSetOfficerActiveMutation,
} from '@/domains/officers/query-options'
import { requirePrivilegeForRoute } from '@/lib/route-guards'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/officers')({
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/officers')
  },
  component: OfficersPage,
})

function OfficersPage() {
  const [showAddModal, setShowAddModal] = useState(false)
  const { data: officers } = useSuspenseQuery(getOfficerPageQueryOptions())
  const { data: positions } = useSuspenseQuery(getOfficerPagePositionsQueryOptions())
  const mutation = useSetOfficerActiveMutation()

  const inactive = officers.filter((officer) => !officer.active)

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold">Officers & Position Holders</h2>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4" />
          Add Record
        </Button>
      </div>
      {showAddModal && (
        <AddOfficerModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => setShowAddModal(false)}
        />
      )}

      <ErrorAlert error={mutation.error?.message} action="Updating officer record" />
      <OfficersOrgChart
        positions={positions}
        officers={officers}
        isUpdating={mutation.isPending}
        onDeactivate={(officer) =>
          mutation.mutate({ data: { index: officer.index, active: false } })
        }
      />

      {inactive.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-3">Inactive</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Member</th>
                  <th className="text-left py-2 font-medium">Position</th>
                  <th className="text-left py-2 font-medium">Active</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {inactive.map((officer) => (
                  <tr key={officer.index} className="border-b">
                    <td className="py-2">
                      <Link
                        to="/members/$wycNumber"
                        params={{ wycNumber: String(officer.wycNumber) }}
                        className="underline"
                      >
                        {officer.memberName}
                      </Link>
                    </td>
                    <td className="py-2">{officer.positionName}</td>
                    <td className="py-2">
                      <span className="text-destructive">Inactive</span>
                    </td>
                    <td className="py-2 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={mutation.isPending}
                        onClick={() =>
                          mutation.mutate({
                            data: { index: officer.index, active: true },
                          })
                        }
                      >
                        Mark Active
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
