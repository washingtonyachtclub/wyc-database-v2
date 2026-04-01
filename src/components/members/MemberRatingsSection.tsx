import { getExpiryInfo } from '@/lib/rating-expiry'
import { getMemberRatingsQueryOptions } from '@/lib/members-query-options'
import { useSuspenseQuery } from '@tanstack/react-query'

export function MemberRatingsSection({ wycNumber }: { wycNumber: number }) {
  const { data: ratings } = useSuspenseQuery(getMemberRatingsQueryOptions(wycNumber))

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Ratings</h2>
      {ratings.length === 0 ? (
        <p className="text-muted-foreground">No ratings recorded.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Rating</th>
              <th className="text-left py-2 font-medium">Date</th>
              <th className="text-left py-2 font-medium">Status</th>
              <th className="text-left py-2 font-medium">Examiner</th>
              <th className="text-left py-2 font-medium">Comments</th>
            </tr>
          </thead>
          <tbody>
            {ratings.map((rating) => {
              const expiryInfo = getExpiryInfo(rating)
              return (
                <tr key={rating.index} className="border-b">
                  <td className="py-2">{rating.ratingText}</td>
                  <td className="py-2">{rating.date}</td>
                  <td className="py-2">
                    {expiryInfo && (
                      <span
                        className={
                          expiryInfo.startsWith('Expired')
                            ? 'text-destructive'
                            : 'text-muted-foreground'
                        }
                      >
                        {expiryInfo}
                      </span>
                    )}
                  </td>
                  <td className="py-2">{rating.examinerName}</td>
                  <td className="py-2">{rating.comments}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
