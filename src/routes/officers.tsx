import { getAllOfficersQueryOptions } from '@/lib/officers-query-options'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/officers')({
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: { redirect: '/officers' },
      })
    }
  },
  component: OfficersPage,
})

function OfficersPage() {
  const { data: officers } = useSuspenseQuery(getAllOfficersQueryOptions())

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Officers</h2>
      {officers.length === 0 ? (
        <p className="text-muted-foreground">No officers found.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Member</th>
              <th className="text-left py-2 font-medium">Position</th>
              <th className="text-left py-2 font-medium">Type</th>
              <th className="text-left py-2 font-medium">Active</th>
            </tr>
          </thead>
          <tbody>
            {officers
              .filter((officer) => officer.positionType !== 'Chief')
              .map((officer) => (
                <tr key={officer.index} className="border-b">
                  <td className="py-2">{officer.memberName}</td>
                  <td className="py-2">{officer.positionName}</td>
                  <td className="py-2">{officer.positionType}</td>
                  <td className="py-2">
                    {officer.active ? 'Yes' : <span className="text-destructive">Inactive</span>}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
