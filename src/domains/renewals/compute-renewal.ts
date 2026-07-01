export type RenewalTier = 'student' | 'nonstudent'
export type RenewalDuration = 'quarterly' | 'annual'

// The quarter an expired member renews into, and the anchor for all renewal math below. Normally
// equal to the current quarter (lesson_quarter.quarter); bump it to the next quarter about two weeks
// before the current one ends so members can renew ahead of the rollover.
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
