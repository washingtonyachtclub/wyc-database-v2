import type { ReactNode } from 'react'
import Papa from 'papaparse'
import { Download } from 'lucide-react'
import {
  getMemberCheckoutsQueryOptions,
  useMemberCheckoutExportMutation,
} from '@/domains/checkouts/query-options'
import { useSuspenseQuery } from '@tanstack/react-query'
import { getTodayPacificDateString } from '@/lib/date-utils'
import { Button } from '../ui/button'
import { ErrorAlert } from '../ui/ErrorAlert'

export function MemberCheckoutsSection({
  wycNumber,
  since,
  title,
  action,
}: {
  wycNumber: number
  since?: string
  title: string
  action?: ReactNode
}) {
  const { data: checkouts } = useSuspenseQuery(getMemberCheckoutsQueryOptions(wycNumber, since))
  const exportMutation = useMemberCheckoutExportMutation()

  const handleExport = () => {
    exportMutation.mutate(wycNumber, {
      onSuccess: (rows) => {
        const csv = Papa.unparse({
          fields: [
            'Skipper',
            'Departed',
            'Returned',
            'Hours Out',
            'Boat',
            'Fleet',
            'Destination',
            'Role',
            'Member Crewmates',
            'Guests',
          ],
          data: rows.map((row) => [
            row.skipper,
            row.departed,
            row.returned,
            row.hoursOut,
            row.boat,
            row.fleet,
            row.destination,
            row.role,
            row.memberCrewmates,
            row.guests,
          ]),
        })
        const url = URL.createObjectURL(
          new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }),
        )
        const link = document.createElement('a')
        link.href = url
        link.download = `wyc-${wycNumber}-checkouts-${getTodayPacificDateString()}.csv`
        document.body.append(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)
      },
    })
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        {action}
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exportMutation.isPending}
        >
          <Download className="h-4 w-4" />
          {exportMutation.isPending ? 'Exporting...' : 'Export All Checkouts'}
        </Button>
      </div>
      <ErrorAlert
        error={exportMutation.error?.message}
        action={`Export all checkouts for WYC #${wycNumber}`}
      />
      {checkouts.length === 0 ? (
        <p className="text-muted-foreground">No checkouts found.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Boat</th>
              <th className="text-left py-2 font-medium">Date</th>
              <th className="text-left py-2 font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {checkouts.map((checkout) => (
              <tr key={checkout.index} className="border-b">
                <td className="py-2">{checkout.boatName}</td>
                <td className="py-2">{checkout.departureDate}</td>
                <td className="py-2">
                  {checkout.isSkipper ? 'Skipper' : `Crew · ${checkout.skipperName}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
