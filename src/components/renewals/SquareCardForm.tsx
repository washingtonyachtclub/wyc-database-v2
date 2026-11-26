import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { getSquarePayments } from '@/lib/square-web'

export interface SquareCardHandle {
  /** Tokenize the entered card into a single-use Square source ID. */
  tokenize: () => Promise<string>
}

/** Mounts the Square card iframe and exposes `tokenize()` via ref for the parent's pay button. */
export const SquareCardForm = forwardRef<
  SquareCardHandle,
  { onError?: (msg: string) => void; onReady?: (ready: boolean) => void }
>(function SquareCardForm({ onError, onReady }, ref) {
  const cardRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const payments = await getSquarePayments()
        if (cancelled) return
        const card = await payments.card()
        if (cancelled) {
          card.destroy?.()
          return
        }
        await card.attach(containerRef.current)
        if (cancelled) {
          await card.destroy()
          return
        }
        cardRef.current = card
        onReady?.(true)
        setLoading(false)
      } catch (e) {
        if (cancelled) return
        setLoading(false)
        console.error('Square card init failed:', e)
        onError?.('Could not load the secure card form. Please refresh and try again.')
      }
    }
    init()
    return () => {
      cancelled = true
      cardRef.current?.destroy?.()
      cardRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useImperativeHandle(ref, () => ({
    async tokenize() {
      if (!cardRef.current) throw new Error('The card form is not ready yet.')
      const result = await cardRef.current.tokenize()
      if (result.status === 'OK') return result.token as string
      throw new Error(
        result.errors?.[0]?.message ?? 'Please check your card details and try again.',
      )
    },
  }))

  return (
    <div className="space-y-2">
      <div ref={containerRef} />
      {loading && <p className="text-sm text-muted-foreground">Loading secure card form…</p>}
    </div>
  )
})
