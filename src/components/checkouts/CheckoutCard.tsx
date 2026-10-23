import type { CheckoutCard as CheckoutCardType } from '@/domains/checkouts/schema'
import { Button } from '@/components/ui/button'
import { CheckoutDetails } from './CheckoutDetails'

export function CheckoutCard({
  checkout,
  onCheckIn,
}: {
  checkout: CheckoutCardType
  onCheckIn: () => void
}) {
  return (
    <article className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      <CheckoutDetails checkout={checkout} />

      {checkout.canCheckIn && (
        <div className="mt-4 flex justify-end">
          <Button onClick={onCheckIn}>Check In</Button>
        </div>
      )}
    </article>
  )
}
