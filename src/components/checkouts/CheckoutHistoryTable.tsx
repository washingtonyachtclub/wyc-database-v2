import { Fragment, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { CheckoutCard } from '@/domains/checkouts/schema'
import { formatCheckoutDateTime } from '@/domains/checkouts/format'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CheckoutDetails } from './CheckoutDetails'

export function CheckoutHistoryTable({ checkouts }: { checkouts: CheckoutCard[] }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const toggle = (index: number) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member name</TableHead>
            <TableHead>Boat</TableHead>
            <TableHead className="hidden sm:table-cell">Destination</TableHead>
            <TableHead>Return time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {checkouts.map((checkout) => {
            const isExpanded = expanded.has(checkout.index)
            return (
              <Fragment key={checkout.index}>
                <TableRow className="cursor-pointer" onClick={() => toggle(checkout.index)}>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto justify-start gap-2 p-0 font-medium"
                      aria-expanded={isExpanded}
                      onClick={(event) => {
                        event.stopPropagation()
                        toggle(checkout.index)
                      }}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {checkout.skipperName}
                    </Button>
                  </TableCell>
                  <TableCell>{checkout.boatName}</TableCell>
                  <TableCell className="hidden sm:table-cell">{checkout.destination}</TableCell>
                  <TableCell>{formatCheckoutDateTime(checkout.timeReturn)}</TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow>
                    <TableCell colSpan={4} className="bg-muted/30 p-5">
                      <CheckoutDetails checkout={checkout} />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
