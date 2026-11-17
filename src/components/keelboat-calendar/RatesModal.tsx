import { useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { rentalHolidays } from '@/domains/keelboat-calendar/holidays'
import { useQuery } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getRentalRates } from '@/domains/keelboat-calendar/pricing-server-fns'
import {
  formatRentalMoney,
  type PricingTier,
  type RentalRateKey,
} from '@/domains/keelboat-calendar/pricing'
import { PricingTierSelector } from './PricingTierSelector'

export function RatesModal({
  defaultTier,
  onClose,
}: {
  defaultTier: PricingTier
  onClose: () => void
}) {
  const [showHolidays, setShowHolidays] = useState(false)
  const holidaysButton = useRef<HTMLButtonElement>(null)
  const [tier, setTier] = useState(defaultTier)
  const rates = useQuery({
    queryKey: ['keelboat-calendar', 'rates'],
    queryFn: () => getRentalRates(),
    staleTime: 60_000,
    retry: false,
  })
  const price = (key: RentalRateKey) => {
    const rate = rates.data?.find((rate) => rate.key === key)
    return rate
      ? formatRentalMoney(rate.amountCents, rate.currency)
      : rates.isPending
        ? 'Loading…'
        : 'Unavailable'
  }
  if (showHolidays)
    return (
      <Modal
        title="Holidays"
        onClose={onClose}
        contentClassName="max-h-[90dvh] overflow-y-auto sm:max-w-xl"
      >
        <Button
          autoFocus
          variant="outline"
          className="w-fit"
          onClick={() => {
            setShowHolidays(false)
            requestAnimationFrame(() => holidaysButton.current?.focus())
          }}
        >
          <ArrowLeft aria-hidden="true" />
          Back
        </Button>
        <Table aria-label="Rental holidays">
          <TableHeader>
            <TableRow>
              <TableHead scope="col" className="text-foreground">
                Holiday
              </TableHead>
              <TableHead scope="col" className="text-foreground">
                Date
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rentalHolidays.map((holiday) => (
              <TableRow key={holiday.rule}>
                <TableHead scope="row" className="whitespace-normal text-foreground">
                  {holiday.name}
                </TableHead>
                <TableCell className="whitespace-normal">{holiday.date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Modal>
    )
  return (
    <Modal
      title="Keelboat rates"
      onClose={onClose}
      contentClassName="max-h-[90dvh] overflow-y-auto sm:max-w-xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 text-foreground">
        <PricingTierSelector value={tier} onChange={setTier} />
        <p id="rental-rate-legend" className="text-sm">
          Half day / Full day
        </p>
      </div>
      {rates.isError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
        >
          <p>Rates are currently unavailable. Please try again later.</p>
          <Button
            variant="outline"
            size="sm"
            disabled={rates.isFetching}
            onClick={() => void rates.refetch()}
          >
            Retry
          </Button>
        </div>
      )}
      <div className="overflow-hidden rounded-lg border">
        <Table
          aria-label="Keelboat rates"
          aria-describedby="rental-rate-legend"
          className="table-fixed"
        >
          <TableHeader>
            <TableRow>
              <TableHead scope="col" className="w-1/4" />
              <TableHead scope="col" className="text-center text-foreground">
                Outboard
              </TableHead>
              <TableHead scope="col" className="text-center text-foreground">
                Inboard
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(['weekday', 'weekend'] as const).map((day) => (
              <TableRow key={day}>
                <TableHead scope="row" className="text-foreground">
                  {day === 'weekday' ? 'Weekday' : 'Weekend / Holiday'}
                </TableHead>
                {(['outboard', 'inboard'] as const).map((engine) => (
                  <TableCell key={engine} className="border-l p-0 tabular-nums">
                    <div className="relative h-24 text-xs sm:text-sm">
                      <span className="absolute left-2 top-3 sm:left-5">
                        <span className="sr-only">Half day: </span>
                        {price(`${tier}:${engine}:${day}:half`)}
                      </span>
                      <svg
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 h-full w-full stroke-border"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                      >
                        <line x1="0" y1="100" x2="100" y2="0" vectorEffect="non-scaling-stroke" />
                      </svg>
                      <span className="absolute bottom-3 right-2 sm:right-5">
                        <span className="sr-only">Full day: </span>
                        {price(`${tier}:${engine}:${day}:full`)}
                      </span>
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Button
        ref={holidaysButton}
        variant="outline"
        className="w-fit"
        onClick={() => setShowHolidays(true)}
      >
        Holidays
      </Button>
    </Modal>
  )
}
