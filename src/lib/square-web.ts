import { isDevEnvironment } from '@/lib/env'

declare global {
  interface Window {
    Square?: any
  }
}

const SDK_URL = isDevEnvironment()
  ? 'https://sandbox.web.squarecdn.com/v1/square.js'
  : 'https://web.squarecdn.com/v1/square.js'

function loadSquareSdk(): Promise<void> {
  if (window.Square) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SDK_URL
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Square Web Payments SDK'))
    document.head.appendChild(script)
  })
}

async function initializePayments() {
  await loadSquareSdk()
  return window.Square.payments(
    import.meta.env.VITE_SQUARE_APPLICATION_ID,
    import.meta.env.VITE_SQUARE_LOCATION_ID,
  )
}

let paymentsPromise: ReturnType<typeof initializePayments> | null = null

export function getSquarePayments() {
  paymentsPromise ??= initializePayments().catch((error) => {
    paymentsPromise = null
    throw error
  })
  return paymentsPromise
}
