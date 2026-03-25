import { getMemberCheckoutsQueryOptions } from '@/lib/checkouts-query-options'
import { useSuspenseQuery } from '@tanstack/react-query'

export function MemberCheckoutsSection({
  wycNumber,
  since,
}: {
  wycNumber: number
  since?: string
}) {
  const { data: checkouts } = useSuspenseQuery(getMemberCheckoutsQueryOptions(wycNumber, since))

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Boat Checkouts (Past 12 Months)</h2>
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
