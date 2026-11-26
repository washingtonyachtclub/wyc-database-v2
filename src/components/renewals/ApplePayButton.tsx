import { Button } from '@/components/ui/button'
import { getSquarePayments } from '@/lib/square-web'
import { useEffect, useState } from 'react'

type Wallet = {
  tokenize(): Promise<{ status: string; token?: string }>
  destroy(): Promise<boolean>
}

type Props = {
  amountCents: number
  currency: string
  disabled: boolean
  onPay: (tokenize: () => Promise<string | null>) => void
}

export function ApplePayButton({ amountCents, currency, disabled, onPay }: Props) {
  const [ready, setReady] = useState<{
    amountCents: number
    currency: string
    wallet: Wallet
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    let wallet: Wallet | undefined

    async function initialize() {
      // Square validates the frame's hostname, while Apple validates the top-level hostname.
      if (window.self !== window.top || amountCents <= 0) return
      try {
        const payments = await getSquarePayments()
        if (cancelled) return
        const request = payments.paymentRequest({
          countryCode: 'US',
          currencyCode: currency,
          total: { label: 'Washington Yacht Club', amount: (amountCents / 100).toFixed(2) },
        })
        wallet = (await payments.applePay(request)) as Wallet
        if (cancelled) await wallet.destroy()
        else setReady({ amountCents, currency, wallet })
      } catch (error) {
        if ((error as Error)?.name !== 'PaymentMethodUnsupportedError') {
          console.warn('Square Apple Pay initialization failed', error)
        }
      }
    }

    setReady(null)
    void initialize()
    return () => {
      cancelled = true
      void wallet?.destroy()
    }
  }, [amountCents, currency])

  if (!ready || ready.amountCents !== amountCents || ready.currency !== currency) return null

  async function tokenize() {
    const result = await ready!.wallet.tokenize()
    if (result.status === 'Cancel') return null
    if (result.status === 'OK' && result.token) return result.token
    throw new Error('Apple Pay could not authorize this payment. Try again or use a card.')
  }

  return (
    <Button
      type="button"
      aria-label="Pay with Apple Pay"
      className="inline-block w-full [-webkit-appearance:-apple-pay-button] [-apple-pay-button-type:pay] [-apple-pay-button-style:black]"
      disabled={disabled}
      onClick={() => onPay(tokenize)}
    />
  )
}
