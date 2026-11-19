import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { SquareCardForm, type SquareCardHandle } from '@/components/renewals/SquareCardForm'
import {
  getRentalSubtotal,
  payRentalReservation,
} from '@/domains/keelboat-calendar/pricing-server-fns'
import { formatRentalMoney } from '@/domains/keelboat-calendar/pricing'
import type { ReservationInput } from '@/domains/keelboat-calendar/schema'
import { RentalBreakdown } from './RentalBreakdown'

export function RentalPayment({
  reservation,
  onCreated,
  onBusyChange,
}: {
  reservation: ReservationInput
  onCreated: (id: number) => void
  onBusyChange: (busy: boolean) => void
}) {
  const queryClient = useQueryClient()
  const card = useRef<SquareCardHandle>(null)
  const [attemptId, setAttemptId] = useState(() => crypto.randomUUID())
  const [message, setMessage] = useState('')
  const [blocked, setBlocked] = useState(false)
  const [busy, setBusy] = useState(false)
  const quote = useQuery({
    queryKey: ['keelboat-calendar', 'subtotal', reservation],
    queryFn: () => getRentalSubtotal({ data: reservation }),
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
  })
  const mutation = useMutation({ mutationFn: payRentalReservation })
  const subtotal = quote.data?.success ? quote.data.data : null
  const pay = async () => {
    if (!subtotal || !card.current || busy || blocked) return
    setBusy(true)
    onBusyChange(true)
    setMessage('')
    let sourceId: string
    try {
      sourceId = await card.current.tokenize()
    } catch {
      setMessage('Please check your card details and try again.')
      setBusy(false)
      onBusyChange(false)
      return
    }
    try {
      const result = await mutation.mutateAsync({
        data: {
          attemptId,
          sourceId,
          reservation,
          expectedAmountCents: subtotal.amountCents,
          expectedCurrency: subtotal.currency,
        },
      })
      if (result.success) {
        void queryClient.invalidateQueries({ queryKey: ['keelboat-calendar'] })
        onCreated(result.id)
      } else {
        setMessage(result.message)
        setBlocked(!result.retryAllowed)
        if (result.retryAllowed) {
          setAttemptId(crypto.randomUUID())
          if ('refreshPrice' in result && result.refreshPrice) await quote.refetch()
        }
      }
    } catch {
      setBlocked(true)
      setMessage(
        'We could not confirm whether your payment completed. Do not pay again. Please contact the club.',
      )
    } finally {
      setBusy(false)
      onBusyChange(false)
    }
  }
  return (
    <div className="space-y-4 [&_.sq-card-message:empty]:hidden">
      {quote.isPending && (
        <p role="status" className="text-sm text-muted-foreground">
          Calculating price…
        </p>
      )}
      {quote.isError && (
        <div role="alert" className="space-y-2 text-sm">
          <p>Pricing is currently unavailable. Please try again later.</p>
          <Button
            variant="outline"
            size="sm"
            disabled={quote.isFetching}
            onClick={() => void quote.refetch()}
          >
            Retry
          </Button>
        </div>
      )}
      {quote.data?.success === false && (
        <p role="alert" className="text-sm">
          {quote.data.message}
        </p>
      )}
      {subtotal && <RentalBreakdown subtotal={subtotal} />}
      {subtotal && !blocked && <SquareCardForm ref={card} onError={setMessage} />}
      {message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
      <p className="text-sm">Reservations cannot be canceled or refunded.</p>
      <Button
        className="w-full"
        disabled={!subtotal || busy || blocked || quote.isFetching}
        onClick={() => void pay()}
      >
        {busy
          ? 'Processing payment…'
          : subtotal
            ? `Pay ${formatRentalMoney(subtotal.amountCents, subtotal.currency)} and reserve`
            : 'Pay and reserve'}
      </Button>
    </div>
  )
}
