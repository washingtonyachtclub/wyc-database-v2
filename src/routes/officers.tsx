import { AddOfficerModal } from '@/components/officers/AddOfficerModal'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { OFFICER_PAGE_SECTIONS } from '@/db/constants'
import type { Officer } from '@/db/types'
import {
  getOfficerPagePositionsQueryOptions,
  getOfficerPageQueryOptions,
  useSetOfficerActiveMutation,
} from '@/lib/officers-query-options'
import { requirePrivilegeForRoute } from '@/lib/route-guards'
import { cn } from '@/lib/utils'
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

  const positionNameMap = new Map(positions.map((p) => [p.index, p.name]))

  const activeByPosition = new Map<number, Officer[]>()
  const inactive: Officer[] = []

  for (const officer of officers) {
    if (officer.active) {
      const list = activeByPosition.get(officer.positionId) ?? []
      list.push(officer)
      activeByPosition.set(officer.positionId, list)
    } else {
      inactive.push(officer)
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
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

      {OFFICER_PAGE_SECTIONS.map((section) => (
        <div key={section.label} className="mb-8">
          <h3 className="text-lg font-semibold mb-3">{section.label}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {section.positions.map((posId) => {
              const holders = activeByPosition.get(posId) ?? []
              return (
                <div
                  key={posId}
                  className={cn(
                    'rounded-lg border p-4',
                    holders.length > 0
                      ? 'bg-card text-card-foreground'
                      : 'bg-muted/50 text-muted-foreground',
                  )}
                >
                  <div className="text-sm font-medium mb-2">
                    {positionNameMap.get(posId) ?? `Position ${posId}`}
                  </div>
                  {holders.length === 0 ? (
                    <div className="text-xs italic">Vacant</div>
                  ) : (
                    <ul className="space-y-1">
                      {holders.map((officer) => (
                        <li key={officer.index} className="flex items-center justify-between gap-2">
                          <Link
                            to="/members/$wycNumber"
                            params={{ wycNumber: String(officer.wycNumber) }}
                            className="text-sm"
                          >
                            {officer.memberName}
                          </Link>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            disabled={mutation.isPending}
                            onClick={() =>
                              mutation.mutate({
                                data: { index: officer.index, active: false },
                              })
                            }
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-3.5 w-3.5"
                            >
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {inactive.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-3">Inactive</h3>
          <table className="w-full text-sm">
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
      )}
    </div>
  )
}
