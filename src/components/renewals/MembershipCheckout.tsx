import { useRef, useState } from 'react'
import { ApplePayButton } from './ApplePayButton'
import { SquareCardForm, type SquareCardHandle } from './SquareCardForm'
import { DiscountCodeField } from '@/components/membership-discount-codes/DiscountCodeField'
import type { DiscountCodeQuote } from '@/domains/membership-discount-codes/schema'
import type { RenewalDuration, RenewalTier } from '@/domains/renewals/compute-renewal'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export function MembershipCheckout({
  audience,
  duration,
  tier,
  price,
  disabled,
  onPay,
  onBusyChange,
}: {
  audience: 'new_members' | 'renewals'
  duration: RenewalDuration
  tier: RenewalTier
  price: { amountCents: number; currency: string }
  disabled?: boolean
  onBusyChange?: (busy: boolean) => void
  onPay: (sourceId: string, discount: DiscountCodeQuote | null) => Promise<void>
}) {
  const card = useRef<SquareCardHandle>(null)
  const busy = useRef(false)
  const [submitting, setSubmitting] = useState(false)
  const [cardReady, setCardReady] = useState(false)
  const [checking, setChecking] = useState(false)
  const [discount, setDiscount] = useState<DiscountCodeQuote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const total = discount?.finalCents ?? price.amountCents
  const money = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.currency,
  }).format(total / 100)
  async function pay(tokenize: () => Promise<string | null>) {
    if (busy.current || disabled || checking) return
    busy.current = true
    setSubmitting(true)
    onBusyChange?.(true)
    setError(null)
    try {
      const source = await tokenize()
      if (source) await onPay(source, discount)
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Could not complete payment. Please try again.',
      )
    } finally {
      busy.current = false
      setSubmitting(false)
      onBusyChange?.(false)
    }
  }
  return (
    <section className="space-y-5 rounded-lg border bg-card p-5">
      <DiscountCodeField
        audience={audience}
        duration={duration}
        tier={tier}
        onApplied={setDiscount}
        onCheckingChange={setChecking}
        disabled={submitting}
      />
      <div className="flex items-baseline justify-between border-t pt-4">
        <h2 className="font-semibold">Total due</h2>
        <strong className="text-2xl">{money}</strong>
      </div>
      <ApplePayButton
        amountCents={total}
        currency={price.currency}
        disabled={Boolean(disabled || submitting || checking)}
        onPay={pay}
      />
      <div className="space-y-2">
        <Label>Card</Label>
        <SquareCardForm ref={card} onError={setError} onReady={setCardReady} />
      </div>
      <ErrorAlert error={error} action="Pay membership dues" />
      <Button
        type="button"
        className="w-full"
        size="lg"
        disabled={!cardReady || disabled || submitting || checking}
        onClick={() => void pay(() => card.current!.tokenize())}
      >
        {submitting ? 'Processing…' : `Pay ${money}`}
      </Button>
    </section>
  )
}
