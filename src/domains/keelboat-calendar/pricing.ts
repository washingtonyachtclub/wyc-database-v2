export const pricingTiers = ['student', 'nonstudent'] as const
export type PricingTier = (typeof pricingTiers)[number]
export type EngineType = 'outboard' | 'inboard'
export type RentalRateKey =
  `${PricingTier}:${EngineType}:${'weekday' | 'weekend'}:${'half' | 'full'}`
export type RentalRate = {
  key: RentalRateKey
  variationId: string
  amountCents: number
  currency: string
}

export const pricingTierLabels: Record<PricingTier, string> = {
  student: 'Student',
  nonstudent: 'Non-student',
}

export function formatRentalMoney(amountCents: number, currency: string) {
  return (amountCents / 100).toLocaleString('en-US', { style: 'currency', currency })
}

export type RentalLineItem = {
  key: RentalRateKey
  label: string
  quantity: number
  unitCents: number
  amountCents: number
  variationId: string
}

export type RentalSubtotal = {
  engine: EngineType
  tier: PricingTier
  lines: RentalLineItem[]
  amountCents: number
  currency: string
}
