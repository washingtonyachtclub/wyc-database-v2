import type { ReactNode } from 'react'
import type { CheckoutCard } from '@/domains/checkouts/schema'
import { formatCheckoutDateTime } from '@/domains/checkouts/format'

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8.25rem_minmax(0,1fr)] gap-2">
      <span className="font-semibold">{label}:</span>
      <span>{children}</span>
    </div>
  )
}

export function CheckoutDetails({ checkout }: { checkout: CheckoutCard }) {
  const hasPeople = checkout.crew.length > 0 || checkout.guests.length > 0

  return (
    <div className="space-y-2.5 text-base">
      <DetailRow label="Skipper">{checkout.skipperName}</DetailRow>
      <DetailRow label="Boat">{checkout.boatName || 'Unknown boat'}</DetailRow>
      <DetailRow label="Destination">{checkout.destination}</DetailRow>
      <DetailRow label="Checkout time">{formatCheckoutDateTime(checkout.timeDeparture)}</DetailRow>
      <div>
        {checkout.ratingName ? (
          <DetailRow label="Relevant rating">{checkout.ratingName}</DetailRow>
        ) : checkout.supervisorName ? (
          <DetailRow label="Supervisor">{checkout.supervisorName}</DetailRow>
        ) : (
          <span className="font-semibold">Supervised sailing</span>
        )}
      </div>

      {hasPeople && (
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="mb-2 font-semibold">Crew</div>
          <ul className="space-y-1.5">
            {checkout.crew.map((member, index) => (
              <li key={`${member.name}-${index}`}>{member.name}</li>
            ))}
            {checkout.guests.map((guest, index) => (
              <li key={`${guest.name}-${index}`}>
                {guest.name} <span className="text-muted-foreground">(guest)</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="pt-1">
        <DetailRow label={checkout.isOut ? 'Estimated return' : 'Check-in time'}>
          {formatCheckoutDateTime(checkout.isOut ? checkout.expectedReturn : checkout.timeReturn)}
        </DetailRow>
      </div>
    </div>
  )
}
