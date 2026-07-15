import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getMembershipStatsQueryOptions } from '@/domains/stats/query-options'
import { STAT_CATEGORY_LABELS, STAT_CATEGORY_ORDER, type StatRow } from '@/domains/stats/schema'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { requirePrivilegeForRoute } from '../lib/route-guards'

export const Route = createFileRoute('/membership-stats')({
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/membership-stats')
  },
  component: MembershipStatsPage,
})

const rowTotal = (row: StatRow) => STAT_CATEGORY_ORDER.reduce((sum, key) => sum + row[key], 0)

function MembershipStatsPage() {
  const { data: stats } = useQuery(getMembershipStatsQueryOptions())

  if (!stats) {
    return <div className="p-6 text-muted-foreground">Loading...</div>
  }

  const columnTotal = (key: (typeof STAT_CATEGORY_ORDER)[number]) =>
    stats.paid[key] + stats.exempt[key]
  const grandTotal = rowTotal(stats.paid) + rowTotal(stats.exempt)
  const studentTotal = columnTotal('student')
  const studentPercent = grandTotal === 0 ? 0 : Math.round((studentTotal * 100) / grandTotal)

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Membership Stats</h1>

      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">Current Quarter</p>
        <p className="text-xl font-semibold">{stats.currentQuarterText}</p>
      </div>

      <p className="text-sm text-muted-foreground">
        Counts all active members (expiration quarter at or after the current quarter). Exempt
        members are those whose most recent renewal was dues-exempt.
      </p>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>&nbsp;</TableHead>
              {STAT_CATEGORY_ORDER.map((key) => (
                <TableHead key={key} className="text-right">
                  {STAT_CATEGORY_LABELS[key]}
                </TableHead>
              ))}
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Paid</TableCell>
              {STAT_CATEGORY_ORDER.map((key) => (
                <TableCell key={key} className="text-right">
                  {stats.paid[key]}
                </TableCell>
              ))}
              <TableCell className="text-right font-medium">{rowTotal(stats.paid)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Exempt</TableCell>
              {STAT_CATEGORY_ORDER.map((key) => (
                <TableCell key={key} className="text-right">
                  {stats.exempt[key]}
                </TableCell>
              ))}
              <TableCell className="text-right font-medium">{rowTotal(stats.exempt)}</TableCell>
            </TableRow>
            <TableRow className="border-t-2">
              <TableCell className="font-semibold">Total</TableCell>
              {STAT_CATEGORY_ORDER.map((key) => (
                <TableCell key={key} className="text-right font-semibold">
                  {columnTotal(key)}
                </TableCell>
              ))}
              <TableCell className="text-right font-semibold">{grandTotal}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-1">
        <p className="text-sm">
          <span className="font-semibold">{studentPercent}%</span> of membership consists of
          students.
        </p>
        {studentPercent < 50 && (
          <p className="text-sm font-medium text-destructive">
            This is lower than the University prefers for a student-run organization (50% minimum).
          </p>
        )}
      </div>
    </div>
  )
}
