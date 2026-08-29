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
    <>
      <div className="space-y-2 sm:hidden">
        {checkouts.map((checkout) => {
          const isExpanded = expanded.has(checkout.index)
          return (
            <div
              key={checkout.index}
              className="overflow-hidden rounded-xl border bg-card shadow-sm"
            >
              <Button
                type="button"
                variant="ghost"
                className="h-auto min-h-14 w-full justify-between rounded-none p-4 text-left"
                aria-expanded={isExpanded}
                onClick={() => toggle(checkout.index)}
              >
                <span className="min-w-0">
                  <span className="block truncate text-base font-semibold">
                    {checkout.skipperName}
                  </span>
                  <span className="block truncate font-normal text-muted-foreground">
                    {checkout.boatName} · {formatCheckoutDateTime(checkout.timeReturn)}
                  </span>
                </span>
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </Button>
              {isExpanded && (
                <div className="border-t bg-muted/30 p-4">
                  <CheckoutDetails checkout={checkout} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member name</TableHead>
              <TableHead>Boat</TableHead>
              <TableHead>Destination</TableHead>
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
                    <TableCell>{checkout.destination}</TableCell>
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
    </>
  )
}
