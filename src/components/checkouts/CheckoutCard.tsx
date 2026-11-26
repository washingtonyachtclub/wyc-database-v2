import type { CheckoutCard as CheckoutCardType } from '@/domains/checkouts/schema'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CheckoutDetails } from './CheckoutDetails'

export function CheckoutCard({
  checkout,
  onCheckIn,
  onEdit,
}: {
  checkout: CheckoutCardType
  onCheckIn: () => void
  onEdit: () => void
}) {
  return (
    <article
      className={cn(
        'rounded-xl border p-4 shadow-sm sm:p-5',
        checkout.participation ? 'border-wyc-gold/50 bg-wyc-gold/15' : 'bg-card',
      )}
    >
      <CheckoutDetails checkout={checkout} />

      {(checkout.canEdit || checkout.canCheckIn) && (
        <div className="mt-4 flex items-center gap-3">
          {checkout.canEdit && (
            <Button variant="outline" onClick={onEdit}>
              Edit
            </Button>
          )}
          {checkout.canCheckIn && (
            <Button className="ml-auto" onClick={onCheckIn}>
              Check In
            </Button>
          )}
        </div>
      )}
    </article>
  )
}
