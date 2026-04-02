import type { CheckoutQueryRow } from './queries'
import { num, str, fullName } from '@/db/mapper-utils'

// --- Core types ---

export type Checkout = {
  index: number
  wycNumber: number
  skipperName: string
  boatId: number
  boatName: string
  fleet: string
  destination: string
  departureDate: string
  departureTime: string
}

// --- Mappers ---

export function toCheckout(row: CheckoutQueryRow): Checkout {
  const timeDeparture = str(row.timeDeparture)
  return {
    index: row.index,
    wycNumber: row.wycNumber,
    skipperName: fullName(row.skipperFirst, row.skipperLast),
    boatId: num(row.boatId),
    boatName: str(row.boatName),
    fleet: str(row.fleet),
    destination: str(row.destination),
    departureDate: timeDeparture.slice(0, 10),
    departureTime: timeDeparture.slice(11, 16),
  }
}
