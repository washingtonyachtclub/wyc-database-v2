import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { isDevEnvironment } from '@/lib/env'

declare global {
  interface Window {
    Square?: any
  }
}

export interface SquareCardHandle {
  /** Tokenize the entered card → single-use source id for payAndRenew. Throws on invalid input. */
  tokenize: () => Promise<string>
}

const SDK_URL = isDevEnvironment()
  ? 'https://sandbox.web.squarecdn.com/v1/square.js'
  : 'https://web.squarecdn.com/v1/square.js'

let sdkPromise: Promise<void> | null = null
function loadSquareSdk(): Promise<void> {
  if (typeof window !== 'undefined' && window.Square) return Promise.resolve()
  if (sdkPromise) return sdkPromise
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SDK_URL
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Square Web Payments SDK'))
    document.head.appendChild(script)
  })
  return sdkPromise
}

/** Mounts the Square card iframe and exposes `tokenize()` via ref for the parent's pay button. */
export const SquareCardForm = forwardRef<SquareCardHandle, { onError?: (msg: string) => void }>(
  function SquareCardForm({ onError }, ref) {
    const cardRef = useRef<any>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      let cancelled = false
      async function init() {
        try {
          await loadSquareSdk()
          if (cancelled) return
          const appId = import.meta.env.VITE_SQUARE_APPLICATION_ID
          const locationId = import.meta.env.VITE_SQUARE_LOCATION_ID
          const payments = window.Square.payments(appId, locationId)
          const card = await payments.card()
          if (cancelled) {
            card.destroy?.()
            return
          }
          await card.attach(containerRef.current)
          cardRef.current = card
          setLoading(false)
        } catch (e) {
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
  },
)
