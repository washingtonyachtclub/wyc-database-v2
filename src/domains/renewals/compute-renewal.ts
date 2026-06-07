export type RenewalTier = 'student' | 'nonstudent'
export type RenewalDuration = 'quarterly' | 'annual'

export const RENEWAL_QUARTER = 111 // Summer 2026

export const MAX_QUARTERS_AHEAD = 4

/** False if renewing for `duration` would push the member past the pre-pay cap. */
export function withinAdvanceLimit(expireQtr: number, duration: RenewalDuration): boolean {
  return computeRenewal(expireQtr, duration) <= RENEWAL_QUARTER + MAX_QUARTERS_AHEAD
}

export function computeRenewal(expireQtr: number, duration: RenewalDuration): number {
  const active = expireQtr >= RENEWAL_QUARTER
  if (active) {
    return duration === 'annual' ? expireQtr + 4 : expireQtr + 1
  }
  return duration === 'annual' ? RENEWAL_QUARTER + 3 : RENEWAL_QUARTER
}
