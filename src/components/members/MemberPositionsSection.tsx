import { getMemberPositionsQueryOptions } from '@/lib/officers-query-options'
import { useSuspenseQuery } from '@tanstack/react-query'

export function MemberPositionsSection({ wycNumber }: { wycNumber: number }) {
  const { data: positions } = useSuspenseQuery(
    getMemberPositionsQueryOptions(wycNumber),
  )

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Positions Held</h2>
      {positions.length === 0 ? (
        <p className="text-muted-foreground">No positions found.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Position</th>
              <th className="text-left py-2 font-medium">Type</th>
              <th className="text-left py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos) => (
              <tr key={pos.index} className="border-b">
                <td className="py-2">{pos.positionName}</td>
                <td className="py-2">{pos.positionType}</td>
                <td className="py-2">
                  {pos.active ? (
                    'Active'
                  ) : (
                    <span className="text-destructive">Inactive</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
