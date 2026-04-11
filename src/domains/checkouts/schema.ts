import type { CheckoutQueryRow, CheckoutTableQueryRow } from './queries'
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

// --- Table page types ---

export type CheckoutTableRow = {
  index: number
  memberName: string
  wycNumber: number
  boatName: string
  fleet: string
  timeDeparture: string
  expectedReturn: string
  timeReturn: string
  ratingName: string
  isOut: boolean
}

export function toCheckoutTableRow(row: CheckoutTableQueryRow): CheckoutTableRow {
  return {
    index: row.index,
    memberName: fullName(row.skipperFirst, row.skipperLast),
    wycNumber: row.wycNumber,
    boatName: str(row.boatName),
    fleet: str(row.fleet),
    timeDeparture: str(row.timeDeparture),
    expectedReturn: str(row.expectedReturn),
    timeReturn: str(row.timeReturn),
    ratingName: str(row.ratingName),
    isOut: row.timeReturn === null,
  }
}
