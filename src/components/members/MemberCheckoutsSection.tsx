import type { ReactNode } from 'react'
import { getMemberCheckoutsQueryOptions } from '@/domains/checkouts/query-options'
import { useSuspenseQuery } from '@tanstack/react-query'

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

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        {action}
      </div>
      {checkouts.length === 0 ? (
        <p className="text-muted-foreground">No checkouts found.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Boat</th>
              <th className="text-left py-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {checkouts.map((checkout) => (
              <tr key={checkout.index} className="border-b">
                <td className="py-2">{checkout.boatName}</td>
                <td className="py-2">{checkout.departureDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
